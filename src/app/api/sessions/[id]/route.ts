import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireAdmin, handleAuthError } from "@/lib/session";
import { updateSessionSchema } from "@/lib/validations";
import { scheduleReminder } from "@/lib/queue";
import { logger } from "@/lib/logger";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth();

        const session = await prisma.session.findUnique({
            where: { id: params.id },
            include: {
                court: true,
                attendances: {
                    include: {
                        player: {
                            select: { id: true, fullName: true, type: true, guestFeeOverride: true, userId: true },
                        },
                    },
                },
                charges: {
                    include: {
                        player: { select: { id: true, fullName: true, type: true } },
                    },
                },
            },
        });

        if (!session) {
            return NextResponse.json({ error: "Khong tim thay buoi tap" }, { status: 404 });
        }

        return NextResponse.json({ session });
    } catch (error) {
        return handleAuthError(error);
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();

        const body = await req.json();
        const parsed = updateSessionSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Du lieu khong hop le", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (parsed.data.courtFee !== undefined) updateData.courtFee = parsed.data.courtFee;
        if (parsed.data.shuttleFee !== undefined) updateData.shuttleFee = parsed.data.shuttleFee;
        if (parsed.data.passStatus !== undefined) updateData.passStatus = parsed.data.passStatus;
        if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
        if (parsed.data.remindAt !== undefined) {
            updateData.remindAt = parsed.data.remindAt ? new Date(parsed.data.remindAt) : null;
        }

        // Shuttle count → auto-calc shuttleFee from settings
        if (parsed.data.shuttleCount !== undefined) {
            updateData.shuttleCount = parsed.data.shuttleCount;
            // Get shuttle price from settings
            const shuttlePriceSetting = await prisma.setting.findUnique({ where: { key: "shuttle_price" } });
            const pricePerShuttle = shuttlePriceSetting ? Number((shuttlePriceSetting.valueJson as any)) : 0;
            updateData.shuttlePrice = pricePerShuttle;
            updateData.shuttleFee = parsed.data.shuttleCount * pricePerShuttle;
        }

        const session = await prisma.session.update({
            where: { id: params.id },
            data: updateData,
        });

        // Reschedule reminder if remindAt changed
        if (parsed.data.remindAt && session.remindAt && session.remindAt > new Date()) {
            try {
                await scheduleReminder(session.id, session.remindAt);
            } catch (e) {
                logger.warn("session", `Failed to reschedule reminder`, e);
            }
        }

        return NextResponse.json({ session });
    } catch (error) {
        return handleAuthError(error);
    }
}
