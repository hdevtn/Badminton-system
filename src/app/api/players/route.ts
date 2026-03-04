import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { createPlayerSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";
import { logger } from "@/lib/logger";

export async function GET() {
    try {
        const players = await prisma.player.findMany({
            include: {
                user: {
                    select: { phone: true, role: true, status: true },
                },
            },
            orderBy: [{ type: "asc" }, { fullName: "asc" }],
        });
        return NextResponse.json({ players });
    } catch (error) {
        logger.error("players", "List error", error);
        return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        const parsed = createPlayerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Du lieu khong hop le", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        let userId: string | undefined;

        // If phone provided, link to user
        if (parsed.data.phone) {
            const phone = normalizePhone(parsed.data.phone);
            let user = await prisma.user.findUnique({ where: { phone } });

            if (!user) {
                user = await prisma.user.create({
                    data: { phone, role: "MEMBER", status: "ACTIVE" },
                });
            }
            userId = user.id;
        }

        const player = await prisma.player.create({
            data: {
                fullName: parsed.data.fullName,
                type: parsed.data.type,
                guestFeeOverride: parsed.data.guestFeeOverride,
                userId,
            },
            include: {
                user: { select: { phone: true } },
            },
        });

        logger.info("players", `Player created: ${player.id}`);
        return NextResponse.json({ player }, { status: 201 });
    } catch (error) {
        return handleAuthError(error);
    }
}
