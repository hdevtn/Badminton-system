import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface ZaloMessage {
    recipientId?: string;
    phone?: string;
    text: string;
}

class ZaloClient {
    private accessToken: string;
    private oaId: string;
    private apiBase: string;
    private mockMode: boolean;

    constructor() {
        this.accessToken = process.env.ZALO_ACCESS_TOKEN || "";
        this.oaId = process.env.ZALO_OA_ID || "";
        this.apiBase = process.env.ZALO_API_BASE || "https://openapi.zalo.me/v3.0";
        this.mockMode = !this.accessToken;

        if (this.mockMode) {
            logger.warn("zalo", "Running in mock mode - no ZALO_ACCESS_TOKEN configured");
        }
    }

    async sendMessage(message: ZaloMessage): Promise<{ success: boolean; messageId?: string }> {
        const logEntry = {
            type: "ZALO" as const,
            payloadJson: message as any,
            status: "PENDING",
        };

        if (this.mockMode) {
            logger.info("zalo-mock", `[MOCK] Zalo message: ${message.text}`);
            await prisma.integrationLog.create({
                data: {
                    ...logEntry,
                    status: "MOCK_SENT",
                },
            });
            return { success: true, messageId: "mock-" + Date.now() };
        }

        try {
            const response = await fetch(`${this.apiBase}/oa/message/cs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    access_token: this.accessToken,
                },
                body: JSON.stringify({
                    recipient: { user_id: message.recipientId },
                    message: { text: message.text },
                }),
            });

            const result = await response.json();

            if (result.error === 0) {
                await prisma.integrationLog.create({
                    data: { ...logEntry, status: "SENT" },
                });
                return { success: true, messageId: result.data?.message_id };
            } else {
                await prisma.integrationLog.create({
                    data: { ...logEntry, status: `FAILED: ${result.message}` },
                });
                logger.error("zalo", "Send failed", result);
                return { success: false };
            }
        } catch (error) {
            await prisma.integrationLog.create({
                data: { ...logEntry, status: `ERROR: ${String(error)}` },
            });
            logger.error("zalo", "Send error", error);
            return { success: false };
        }
    }

    async sendReminderToAdmin(
        courtName: string,
        sessionTime: string,
        attendeeCount: number,
        threshold: number,
        sessionId: string
    ): Promise<void> {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const text = [
            `[Nhac lich danh cau]`,
            `San: ${courtName}`,
            `Thoi gian: ${sessionTime}`,
            `So nguoi dang ky: ${attendeeCount}/${threshold}`,
            `Can them nguoi! Xem chi tiet: ${appUrl}/admin/sessions?id=${sessionId}`,
        ].join("\n");

        await this.sendMessage({ text });
    }
}

let zaloClient: ZaloClient | null = null;

export function getZaloClient(): ZaloClient {
    if (!zaloClient) {
        zaloClient = new ZaloClient();
    }
    return zaloClient;
}
