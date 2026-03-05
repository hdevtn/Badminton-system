import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/session";

export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month"); // YYYY-MM
        const courtId = searchParams.get("courtId");

        const where: Record<string, unknown> = {};

        if (month) {
            const [year, m] = month.split("-").map(Number);
            const startDate = new Date(year, m - 1, 1);
            const endDate = new Date(year, m, 1);
            where.startAt = { gte: startDate, lt: endDate };
        }

        if (courtId) {
            where.courtId = courtId;
        }

        const sessions = await prisma.session.findMany({
            where,
            include: {
                court: { select: { name: true, location: true, maxCheckin: true } },
                attendances: {
                    include: {
                        player: { select: { id: true, fullName: true, type: true, userId: true } },
                    },
                },
                _count: {
                    select: { attendances: { where: { attending: true } } },
                },
            },
            orderBy: { startAt: "asc" },
        });

        return NextResponse.json({ sessions });
    } catch (error) {
        return handleAuthError(error);
    }
}
