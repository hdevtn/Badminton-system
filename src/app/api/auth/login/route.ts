import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { loginSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";
import { getSetting } from "@/lib/settings";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "So dien thoai khong hop le", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const phone = normalizePhone(parsed.data.phone);

        // Rate limit
        const rateLimitKey = getRateLimitKey(req, phone);
        const { allowed, remaining } = checkRateLimit(rateLimitKey, {
            windowMs: 60 * 1000,
            maxRequests: 10,
        });

        if (!allowed) {
            return NextResponse.json(
                { error: "Qua nhieu yeu cau. Vui long thu lai sau." },
                { status: 429 }
            );
        }

        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        const userAgent = req.headers.get("user-agent") || "";

        // Find user
        const user = await prisma.user.findUnique({ where: { phone } });

        if (!user) {
            // Log failed attempt
            await prisma.authLog.create({
                data: { phone, ip, userAgent, action: "LOGIN" },
            });
            return NextResponse.json(
                { error: "So dien thoai chua duoc dang ky trong he thong" },
                { status: 404 }
            );
        }

        if (user.status !== "ACTIVE") {
            return NextResponse.json(
                { error: "Tai khoan da bi vo hieu hoa" },
                { status: 403 }
            );
        }

        // Check if OTP is required
        const requireOtp = await getSetting("auth_require_otp");

        if (requireOtp && (user.role === "ADMIN" || !user)) {
            await prisma.authLog.create({
                data: { userId: user.id, phone, ip, userAgent, action: "LOGIN" },
            });
            return NextResponse.json({
                requiresOtp: true,
                message: "Vui long xac thuc OTP",
            });
        }

        // Quick login - create session immediately
        const session = await getSession();
        session.userId = user.id;
        session.phone = user.phone;
        session.role = user.role;
        session.isLoggedIn = true;
        await session.save();

        // Audit log
        await prisma.authLog.create({
            data: { userId: user.id, phone, ip, userAgent, action: "LOGIN" },
        });

        logger.info("auth", `User ${user.id} logged in`, { phone, ip });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error("auth", "Login error", error);
        return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
    }
}
