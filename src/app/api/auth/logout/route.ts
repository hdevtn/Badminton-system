import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();

        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const userAgent = req.headers.get("user-agent") || "";

        if (session.userId) {
            await prisma.authLog.create({
                data: {
                    userId: session.userId,
                    phone: session.phone || "",
                    ip,
                    userAgent,
                    action: "LOGOUT",
                },
            });
        }

        session.destroy();

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("auth", "Logout error", error);
        return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
    }
}
