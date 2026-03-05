/**
 * GET /api/leaderboard
 * Thống kê số buổi tham gia của từng thành viên
 * Admin: thấy tất cả | Member: thấy top + bản thân
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/session";

export async function GET() {
    try {
        const currentUser = await requireAuth();
        const isAdmin = currentUser.role === "ADMIN";

        // Count attendance per player
        const stats = await prisma.attendance.groupBy({
            by: ["playerId"],
            where: { attending: true },
            _count: { id: true },
        });

        // Get player info
        const playerIds = stats.map(s => s.playerId);
        const players = await prisma.player.findMany({
            where: { id: { in: playerIds } },
            select: { id: true, fullName: true, type: true, userId: true },
        });

        // Build entries
        const entries = stats
            .map(s => {
                const player = players.find(p => p.id === s.playerId);
                if (!player) return null;
                return {
                    playerId: player.id,
                    fullName: player.fullName,
                    type: player.type,
                    totalSessions: s._count.id,
                    userId: player.userId,
                };
            })
            .filter(Boolean)
            .sort((a, b) => b!.totalSessions - a!.totalSessions)
            .map((entry, idx) => ({
                ...entry!,
                rank: idx + 1,
            }));

        // For non-admin, find their own stats
        let myStats = null;
        if (!isAdmin) {
            const myPlayer = await prisma.player.findUnique({
                where: { userId: currentUser.userId },
            });
            if (myPlayer) {
                myStats = entries.find(e => e.playerId === myPlayer.id) || {
                    playerId: myPlayer.id,
                    fullName: myPlayer.fullName,
                    type: myPlayer.type,
                    totalSessions: 0,
                    rank: entries.length + 1,
                };
            }
        }

        // Remove userId from response
        const cleanEntries = entries.map(({ userId, ...rest }) => rest);

        return NextResponse.json({
            entries: isAdmin ? cleanEntries : cleanEntries,
            myStats: myStats ? { playerId: myStats.playerId, fullName: myStats.fullName, type: myStats.type, totalSessions: myStats.totalSessions, rank: myStats.rank } : null,
        });
    } catch (error) {
        return handleAuthError(error);
    }
}
