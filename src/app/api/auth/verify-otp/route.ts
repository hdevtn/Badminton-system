import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { verifyOtpSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";
import { getOtpProvider } from "@/lib/otp-provider";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = verifyOtpSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Du lieu khong hop le" },
                { status: 400 }
            );
        }

        const phone = normalizePhone(parsed.data.phone);
        const { code } = parsed.data;

        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const userAgent = req.headers.get("user-agent") || "";

        // Verify OTP
        const provider = getOtpProvider();
        const valid = await provider.verifyOtp(phone, code);

        await prisma.authLog.create({
            data: { phone, ip, userAgent, action: "OTP_VERIFY" },
        });

        if (!valid) {
            return NextResponse.json(
                { error: "Ma OTP khong dung hoac da het han" },
                { status: 400 }
            );
        }

        // Find or create user
        let user = await prisma.user.findUnique({ where: { phone } });

        if (!user) {
            // Auto-register new user as MEMBER
            user = await prisma.user.create({
                data: {
                    phone,
                    role: "MEMBER",
                    status: "ACTIVE",
                },
            });
            logger.info("auth", `New user created via OTP: ${user.id}`);
        }

        if (user.status !== "ACTIVE") {
            return NextResponse.json(
                { error: "Tai khoan da bi vo hieu hoa" },
                { status: 403 }
            );
        }

        // Create session
        const session = await getSession();
        session.userId = user.id;
        session.phone = user.phone;
        session.role = user.role;
        session.isLoggedIn = true;
        await session.save();

        logger.info("auth", `User ${user.id} logged in via OTP`);

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
        logger.error("auth", "Verify OTP error", error);
        return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
    }
}
