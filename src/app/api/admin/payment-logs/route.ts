import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";

// GET /api/admin/payment-logs - Lấy log thanh toán
export async function GET(req: NextRequest) {
    try {
        await requireAdmin();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = parseInt(searchParams.get("perPage") || "50");
        const status = searchParams.get("status"); // SUCCESS | FAILED | ERROR
        const playerId = searchParams.get("playerId");

        const where: any = {};
        if (status) where.status = status;
        if (playerId) where.playerId = playerId;

        const [logs, total] = await Promise.all([
            prisma.paymentLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * perPage,
                take: perPage,
            }),
            prisma.paymentLog.count({ where }),
        ]);

        // Enrich with player names
        const playerIds = [...new Set(logs.filter(l => l.playerId).map(l => l.playerId!))];
        const players = playerIds.length > 0
            ? await prisma.player.findMany({
                where: { id: { in: playerIds } },
                select: { id: true, fullName: true },
            })
            : [];
        const playerMap = Object.fromEntries(players.map(p => [p.id, p.fullName]));

        const enrichedLogs = logs.map(log => ({
            ...log,
            amount: log.amount ? Number(log.amount) : null,
            playerName: log.playerId ? playerMap[log.playerId] || "Không rõ" : null,
        }));

        return NextResponse.json({
            logs: enrichedLogs,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (error) {
        return handleAuthError(error);
    }
}
