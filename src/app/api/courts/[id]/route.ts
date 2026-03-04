import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { updateCourtSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const court = await prisma.court.findUnique({
            where: { id: params.id },
        });

        if (!court) {
            return NextResponse.json({ error: "Không tìm thấy sân" }, { status: 404 });
        }

        return NextResponse.json({ court });
    } catch (error) {
        return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();

        const body = await req.json();
        const parsed = updateCourtSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const court = await prisma.court.update({
            where: { id: params.id },
            data: parsed.data,
        });

        return NextResponse.json({ court });
    } catch (error) {
        return handleAuthError(error);
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();

        await prisma.court.update({
            where: { id: params.id },
            data: { active: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleAuthError(error);
    }
}
