import { Queue, Worker, Job } from "bullmq";
import { getRedisConnection } from "@/lib/redis";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getZaloClient } from "@/lib/zalo-client";
import { getSetting } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";

// ============================================================
// REMINDER QUEUE
// ============================================================

let reminderQueue: Queue | null = null;

export function getReminderQueue(): Queue {
    if (!reminderQueue) {
        reminderQueue = new Queue("reminders", {
            connection: getRedisConnection() as any,
            defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            },
        });
    }
    return reminderQueue;
}

export async function scheduleReminder(
    sessionId: string,
    remindAt: Date
): Promise<void> {
    const queue = getReminderQueue();
    const delay = remindAt.getTime() - Date.now();

    if (delay <= 0) {
        logger.warn("queue", `Reminder for session ${sessionId} is in the past, skipping`);
        return;
    }

    await queue.add(
        "session-reminder",
        { sessionId },
        {
            jobId: `reminder-${sessionId}`,
            delay,
        }
    );

    logger.info("queue", `Scheduled reminder for session ${sessionId} at ${remindAt.toISOString()}`);
}

export async function processReminder(job: Job): Promise<void> {
    const { sessionId } = job.data;

    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
            court: true,
            attendances: {
                where: { attending: true },
            },
        },
    });

    if (!session) {
        logger.warn("queue", `Session ${sessionId} not found for reminder`);
        return;
    }

    const threshold = await getSetting("remind_threshold");
    const attendeeCount = session.attendances.length;

    if (attendeeCount < threshold) {
        const zalo = getZaloClient();
        await zalo.sendReminderToAdmin(
            session.court.name,
            formatDateTime(session.startAt),
            attendeeCount,
            threshold,
            sessionId
        );
        logger.info("queue", `Reminder sent: ${attendeeCount}/${threshold} for session ${sessionId}`);
    } else {
        logger.info("queue", `Session ${sessionId} has enough attendees (${attendeeCount}/${threshold}), no reminder needed`);
    }
}

// ============================================================
// BILLING QUEUE
// ============================================================

let billingQueue: Queue | null = null;

export function getBillingQueue(): Queue {
    if (!billingQueue) {
        billingQueue = new Queue("billing", {
            connection: getRedisConnection() as any,
            defaultJobOptions: {
                removeOnComplete: 50,
                removeOnFail: 20,
                attempts: 2,
            },
        });
    }
    return billingQueue;
}

// ============================================================
// WORKER STARTER
// ============================================================

let reminderWorker: Worker | null = null;

export function startWorkers(): void {
    if (reminderWorker) return;

    reminderWorker = new Worker(
        "reminders",
        async (job) => {
            await processReminder(job);
        },
        {
            connection: getRedisConnection() as any,
            concurrency: 5,
        }
    );

    reminderWorker.on("completed", (job) => {
        logger.info("worker", `Reminder job ${job.id} completed`);
    });

    reminderWorker.on("failed", (job, err) => {
        logger.error("worker", `Reminder job ${job?.id} failed`, err.message);
    });

    logger.info("worker", "Reminder worker started");
}
