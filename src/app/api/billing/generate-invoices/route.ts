import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { generateInvoicesSchema } from "@/lib/validations";
import { generateVietQRUrl, generateTransferDescription } from "@/lib/vietqr";
import { Decimal } from "@prisma/client/runtime/library";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const { searchParams } = new URL(req.url);
        const period = searchParams.get("period");

        const parsed = generateInvoicesSchema.safeParse({ period });
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Kỳ không hợp lệ (YYYY-MM)", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const [year, month] = parsed.data.period.split("-").map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        // Get all charges for sessions in this period
        const charges = await prisma.charge.findMany({
            where: {
                session: {
                    startAt: { gte: startDate, lt: endDate },
                },
            },
            include: {
                player: {
                    include: { user: { select: { phone: true } } },
                },
                session: true,
            },
        });

        // Group charges by player
        const playerCharges = new Map<string, {
            playerId: string;
            phone: string;
            total: number;
            items: { sessionId: string; amount: number; breakdown: unknown }[];
        }>();

        for (const charge of charges) {
            const existing = playerCharges.get(charge.playerId) || {
                playerId: charge.playerId,
                phone: charge.player.user?.phone || "",
                total: 0,
                items: [],
            };

            const amount = Number(charge.amountDecimal);
            existing.total += amount;
            existing.items.push({
                sessionId: charge.sessionId,
                amount,
                breakdown: charge.metaJson,
            });

            playerCharges.set(charge.playerId, existing);
        }

        // Create invoices in transaction
        const invoices = await prisma.$transaction(async (tx) => {
            // Delete existing unpaid invoices for this period
            await tx.invoice.deleteMany({
                where: {
                    periodYyyyMm: parsed.data.period,
                    status: "UNPAID",
                },
            });

            const created = [];

            for (const [playerId, data] of playerCharges) {
                if (data.total <= 0) continue;

                // Generate VietQR
                const addInfo = generateTransferDescription({
                    invoiceId: playerId.slice(-8),
                    playerName: data.phone || playerId,
                    period: parsed.data.period,
                });
                const qrPayload = {
                    qrUrl: generateVietQRUrl({ amount: data.total, description: addInfo }),
                    description: addInfo,
                    amount: data.total,
                };

                const invoice = await tx.invoice.create({
                    data: {
                        playerId,
                        periodYyyyMm: parsed.data.period,
                        totalDecimal: new Decimal(data.total),
                        status: "UNPAID",
                        vietqrPayloadJson: qrPayload as any,
                        invoiceItems: {
                            create: data.items.map((item) => ({
                                sessionId: item.sessionId,
                                amountDecimal: new Decimal(item.amount),
                                breakdownJson: item.breakdown as any,
                            })),
                        },
                    },
                    include: {
                        invoiceItems: true,
                        player: { select: { fullName: true } },
                    },
                });

                created.push(invoice);
            }

            return created;
        });

        logger.info("billing", `Generated ${invoices.length} invoices for period ${parsed.data.period}`);

        return NextResponse.json({
            invoices,
            count: invoices.length,
            period: parsed.data.period,
        }, { status: 201 });
    } catch (error) {
        return handleAuthError(error);
    }
}
