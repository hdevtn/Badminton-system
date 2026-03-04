import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { createCourtSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET() {
    try {
        const courts = await prisma.court.findMany({
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ courts });
    } catch (error) {
        logger.error("courts", "List error", error);
        return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        const parsed = createCourtSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const court = await prisma.court.create({
            data: {
                name: parsed.data.name,
                location: parsed.data.location,
                description: parsed.data.description,
                passEnabled: parsed.data.passEnabled,
                maxCheckin: parsed.data.maxCheckin,
                defaultCourtFee: parsed.data.defaultCourtFee,
                hourlyRate: parsed.data.hourlyRate,
            },
        });

        logger.info("courts", `Court created: ${court.id}`);
        return NextResponse.json({ court }, { status: 201 });
    } catch (error) {
        return handleAuthError(error);
    }
}
