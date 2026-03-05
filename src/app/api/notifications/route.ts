/**
 * GET  /api/notifications        - Lấy danh sách thông báo (admin)
 * POST /api/notifications         - Tạo thông báo mới (từ user)
 * PATCH /api/notifications        - Duyệt/từ chối (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireAdmin, handleAuthError } from "@/lib/session";
import { logger } from "@/lib/logger";

// GET - lấy danh sách thông báo
export async function GET() {
    try {
        await requireAdmin();

        const notifications = await prisma.notification.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        const pendingCount = await prisma.notification.count({
            where: { status: "PENDING" },
        });

        return NextResponse.json({ notifications, pendingCount });
    } catch (error) {
        return handleAuthError(error);
    }
}

// POST - User gửi yêu cầu (đổi loại, v.v.)
export async function POST(req: NextRequest) {
    try {
        const currentUser = await requireAuth();
        const body = await req.json();

        const { type, title, message, metaJson } = body;

        // Tìm player
        const player = await prisma.player.findUnique({
            where: { userId: currentUser.userId },
        });

        const notification = await prisma.notification.create({
            data: {
                type: type || "GENERAL",
                fromUserId: currentUser.userId,
                playerId: player?.id || null,
                title: title || "Thông báo",
                message: message || "",
                metaJson: metaJson || null,
                status: "PENDING",
            },
        });

        logger.info("notification", `New notification from ${currentUser.userId}: ${title}`);

        return NextResponse.json({ notification });
    } catch (error) {
        return handleAuthError(error);
    }
}

// PATCH - Admin duyệt/từ chối
export async function PATCH(req: NextRequest) {
    try {
        await requireAdmin();
        const { id, action } = await req.json(); // action: "approve" | "reject"

        const notification = await prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) {
            return NextResponse.json({ error: "Không tìm thấy thông báo" }, { status: 404 });
        }

        if (notification.type === "TYPE_CHANGE_REQUEST" && action === "approve") {
            // Đổi loại player
            const meta = notification.metaJson as any;
            if (meta?.playerId && meta?.newType) {
                await prisma.player.update({
                    where: { id: meta.playerId },
                    data: { type: meta.newType },
                });
                logger.info("notification", `Approved type change for player ${meta.playerId} → ${meta.newType}`);
            }
        }

        const newStatus = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "READ";

        await prisma.notification.update({
            where: { id },
            data: {
                status: newStatus,
                resolvedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, status: newStatus });
    } catch (error) {
        return handleAuthError(error);
    }
}
