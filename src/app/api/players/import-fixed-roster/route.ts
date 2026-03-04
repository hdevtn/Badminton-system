import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { importRosterSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        const parsed = importRosterSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Du lieu khong hop le", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const results = await prisma.$transaction(async (tx) => {
            const created = [];

            for (const p of parsed.data.players) {
                let userId: string | undefined;

                if (p.phone) {
                    const phone = normalizePhone(p.phone);
                    let user = await tx.user.findUnique({ where: { phone } });
                    if (!user) {
                        user = await tx.user.create({
                            data: { phone, role: "MEMBER", status: "ACTIVE" },
                        });
                    }
                    userId = user.id;
                }

                const player = await tx.player.create({
                    data: {
                        fullName: p.fullName,
                        type: p.type,
                        guestFeeOverride: p.guestFeeOverride,
                        userId,
                    },
                });

                created.push(player);
            }

            return created;
        });

        logger.info("players", `Imported ${results.length} players`);
        return NextResponse.json({ players: results, count: results.length }, { status: 201 });
    } catch (error) {
        return handleAuthError(error);
    }
}
