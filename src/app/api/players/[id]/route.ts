import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { updatePlayerSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const player = await prisma.player.findUnique({
            where: { id: params.id },
            include: {
                user: { select: { phone: true, role: true } },
            },
        });

        if (!player) {
            return NextResponse.json({ error: "Khong tim thay nguoi choi" }, { status: 404 });
        }

        return NextResponse.json({ player });
    } catch {
        return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();

        const body = await req.json();
        const parsed = updatePlayerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Du lieu khong hop le", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
        if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
        if (parsed.data.guestFeeOverride !== undefined) updateData.guestFeeOverride = parsed.data.guestFeeOverride;

        if (parsed.data.phone) {
            const phone = normalizePhone(parsed.data.phone);
            let user = await prisma.user.findUnique({ where: { phone } });
            if (!user) {
                user = await prisma.user.create({
                    data: { phone, role: "MEMBER", status: "ACTIVE" },
                });
            }
            updateData.userId = user.id;
        }

        const player = await prisma.player.update({
            where: { id: params.id },
            data: updateData,
            include: { user: { select: { phone: true } } },
        });

        return NextResponse.json({ player });
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

        await prisma.player.update({
            where: { id: params.id },
            data: { active: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleAuthError(error);
    }
}
