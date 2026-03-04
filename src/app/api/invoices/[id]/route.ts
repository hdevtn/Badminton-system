import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/session";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const currentUser = await requireAuth();

        const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            include: {
                player: {
                    select: { id: true, fullName: true, type: true, userId: true },
                    include: { user: { select: { phone: true } } },
                },
                invoiceItems: {
                    include: {
                        session: {
                            select: { startAt: true, endAt: true, courtFee: true, shuttleFee: true, passStatus: true },
                            include: { court: { select: { name: true } } },
                        },
                    },
                },
                payments: true,
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Khong tim thay hoa don" }, { status: 404 });
        }

        // RBAC check
        if (currentUser.role !== "ADMIN" && invoice.player.userId !== currentUser.userId) {
            return NextResponse.json({ error: "Khong co quyen" }, { status: 403 });
        }

        return NextResponse.json({ invoice });
    } catch (error) {
        return handleAuthError(error);
    }
}
