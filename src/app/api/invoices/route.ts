import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/session";

export async function GET(req: NextRequest) {
    try {
        const currentUser = await requireAuth();

        const { searchParams } = new URL(req.url);
        const period = searchParams.get("period");
        const playerId = searchParams.get("playerId");

        const where: Record<string, unknown> = {};

        if (period) {
            where.periodYyyyMm = period;
        }

        // Non-admin can only see their own invoices
        if (currentUser.role !== "ADMIN" && playerId) {
            // Verify the player belongs to the current user
            const player = await prisma.player.findFirst({
                where: { id: playerId, userId: currentUser.userId },
            });
            if (!player) {
                return NextResponse.json({ error: "Khong co quyen" }, { status: 403 });
            }
            where.playerId = playerId;
        } else if (currentUser.role !== "ADMIN") {
            // Get player for this user
            const player = await prisma.player.findFirst({
                where: { userId: currentUser.userId },
            });
            if (player) {
                where.playerId = player.id;
            } else {
                return NextResponse.json({ invoices: [] });
            }
        } else if (playerId) {
            where.playerId = playerId;
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                player: { select: { id: true, fullName: true, type: true } },
                payments: true,
                _count: { select: { invoiceItems: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ invoices });
    } catch (error) {
        return handleAuthError(error);
    }
}
