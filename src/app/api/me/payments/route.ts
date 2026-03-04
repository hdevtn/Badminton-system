/**
 * GET /api/me/payments
 * Lấy lịch sử thanh toán của user hiện tại
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/session";

export async function GET(req: NextRequest) {
    try {
        const currentUser = await requireAuth();

        // Tìm player liên kết
        const player = await prisma.player.findUnique({
            where: { userId: currentUser.userId },
        });

        if (!player) {
            return NextResponse.json({ payments: [] });
        }

        // Lấy tất cả payments qua invoices của player
        const payments = await prisma.payment.findMany({
            where: {
                invoice: {
                    playerId: player.id,
                },
            },
            include: {
                invoice: {
                    select: {
                        id: true,
                        periodYyyyMm: true,
                        totalDecimal: true,
                        status: true,
                    },
                },
            },
            orderBy: { paidAt: "desc" },
        });

        return NextResponse.json({ payments });
    } catch (error) {
        return handleAuthError(error);
    }
}
