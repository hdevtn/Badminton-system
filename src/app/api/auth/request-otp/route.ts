import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requestOtpSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";
import { getOtpProvider } from "@/lib/otp-provider";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = requestOtpSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "So dien thoai khong hop le" },
                { status: 400 }
            );
        }

        const phone = normalizePhone(parsed.data.phone);

        // Rate limit
        const rateLimitKey = getRateLimitKey(req, phone);
        const { allowed } = checkRateLimit(rateLimitKey, {
            windowMs: 60 * 1000,
            maxRequests: 3,
        });

        if (!allowed) {
            return NextResponse.json(
                { error: "Qua nhieu yeu cau OTP. Vui long thu lai sau." },
                { status: 429 }
            );
        }

        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const userAgent = req.headers.get("user-agent") || "";

        // Send OTP
        const provider = getOtpProvider();
        const result = await provider.sendOtp(phone);

        // Log
        await prisma.authLog.create({
            data: { phone, ip, userAgent, action: "OTP_REQUEST" },
        });

        if (result.success) {
            logger.info("auth", `OTP sent to ${phone}`);
            return NextResponse.json({
                success: true,
                message: "Ma OTP da duoc gui",
                // In dev mode, return the code
                ...(process.env.NODE_ENV === "development" && { devCode: result.code }),
            });
        }

        return NextResponse.json(
            { error: "Khong the gui OTP. Vui long thu lai." },
            { status: 500 }
        );
    } catch (error) {
        logger.error("auth", "Request OTP error", error);
        return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
    }
}
