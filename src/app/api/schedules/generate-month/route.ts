import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { generateMonthSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { getSetting } from "@/lib/settings";
import { scheduleReminder } from "@/lib/queue";

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        const parsed = generateMonthSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Du lieu khong hop le", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { courtId, month, year, rules } = parsed.data;

        // Get court
        const court = await prisma.court.findUnique({ where: { id: courtId } });
        if (!court) {
            return NextResponse.json({ error: "Khong tim thay san" }, { status: 404 });
        }

        const remindOffsetHours = await getSetting("remind_offset_hours");

        // Save schedule rules
        await prisma.monthlySchedule.upsert({
            where: {
                courtId_month_year: { courtId, month, year },
            },
            update: {
                rulesJson: rules as any,
            },
            create: {
                courtId,
                month,
                year,
                rulesJson: rules as any,
            },
        });

        // Generate sessions for each day of the month
        const sessions = [];
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay(); // 0=Sunday

            for (const rule of rules) {
                if (rule.dayOfWeek === dayOfWeek) {
                    const [startH, startM] = rule.startTime.split(":").map(Number);
                    const [endH, endM] = rule.endTime.split(":").map(Number);

                    const startAt = new Date(year, month - 1, day, startH, startM);
                    const endAt = new Date(year, month - 1, day, endH, endM);

                    // Calculate remind_at (default: X hours before start)
                    const remindAt = new Date(startAt.getTime() - remindOffsetHours * 60 * 60 * 1000);

                    const courtFee = rule.courtFeeOverride ?? Number(court.defaultCourtFee);

                    sessions.push({
                        courtId,
                        startAt,
                        endAt,
                        courtFee,
                        shuttleFee: 0,
                        passStatus: "NONE" as const,
                        remindAt,
                        status: "OPEN" as const,
                    });
                }
            }
        }

        // Filter out sessions that already exist (avoid duplicates, don't delete old ones)
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 1);

        const existingSessions = await prisma.session.findMany({
            where: {
                courtId,
                startAt: { gte: monthStart, lt: monthEnd },
            },
            select: { startAt: true, endAt: true },
        });

        // Only create sessions that don't already exist
        const newSessions = sessions.filter((s) => {
            return !existingSessions.some(
                (e) => e.startAt.getTime() === s.startAt.getTime() && e.endAt.getTime() === s.endAt.getTime()
            );
        });

        // Create only new sessions
        const created = await prisma.$transaction(
            newSessions.map((s) => prisma.session.create({ data: s }))
        );

        // Schedule reminders for each session
        for (const s of created) {
            if (s.remindAt && s.remindAt > new Date()) {
                try {
                    await scheduleReminder(s.id, s.remindAt);
                } catch (e) {
                    logger.warn("schedule", `Failed to schedule reminder for session ${s.id}`, e);
                }
            }
        }

        logger.info("schedule", `Generated ${created.length} sessions for ${court.name} ${month}/${year}`);

        return NextResponse.json({
            schedule: { courtId, month, year, rules },
            sessionsCreated: created.length,
        }, { status: 201 });
    } catch (error) {
        return handleAuthError(error);
    }
}
