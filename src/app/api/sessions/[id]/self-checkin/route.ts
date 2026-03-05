/**
 * POST /api/sessions/[id]/self-checkin
 * Cho phép member tự điểm danh (toggle có mặt/vắng)
 * Cancel: yêu cầu lý do, không cho hủy trước 1h trước khi bắt đầu
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const currentUser = await requireAuth();
        const sessionId = params.id;

        let body: { action?: string; cancelReason?: string } = {};
        try {
            body = await req.json();
        } catch {
            // no body is ok for toggle
        }

        const action = body.action || "toggle"; // "checkin" | "cancel" | "toggle"
        const cancelReason = body.cancelReason || "";

        const result = await prisma.$transaction(async (tx) => {
            // Kiểm tra buổi tập tồn tại và đang mở
            const session = await tx.session.findUnique({
                where: { id: sessionId },
                include: { court: true },
            });

            if (!session) {
                throw new Error("SESSION_NOT_FOUND");
            }

            if (session.status !== "OPEN") {
                throw new Error("SESSION_CLOSED");
            }

            // Tìm player liên kết với user hiện tại
            const player = await tx.player.findUnique({
                where: { userId: currentUser.userId },
            });

            if (!player) {
                throw new Error("PLAYER_NOT_FOUND");
            }

            // Kiểm tra attendance hiện tại
            const existingAttendance = await tx.attendance.findUnique({
                where: {
                    sessionId_playerId: { sessionId, playerId: player.id },
                },
            });

            // Decide new state
            let newAttending: boolean;
            if (action === "checkin") {
                newAttending = true;
            } else if (action === "cancel") {
                newAttending = false;

                // Kiểm tra không được hủy trước 1h trước khi bắt đầu
                const now = new Date();
                const oneHourBefore = new Date(session.startAt.getTime() - 60 * 60 * 1000);
                if (now >= oneHourBefore) {
                    throw new Error("CANCEL_TOO_LATE");
                }

                // Yêu cầu lý do hủy
                if (!cancelReason || cancelReason.trim().length === 0) {
                    throw new Error("CANCEL_REASON_REQUIRED");
                }
            } else {
                // toggle mode
                newAttending = existingAttendance ? !existingAttendance.attending : true;
            }

            // Kiểm tra max capacity khi điểm danh
            if (newAttending) {
                const currentCount = await tx.attendance.count({
                    where: {
                        sessionId,
                        attending: true,
                        NOT: { playerId: player.id },
                    },
                });

                if (currentCount >= session.court.maxCheckin) {
                    throw new Error("SESSION_FULL");
                }
            }

            // Upsert attendance
            const attendance = await tx.attendance.upsert({
                where: {
                    sessionId_playerId: { sessionId, playerId: player.id },
                },
                update: {
                    attending: newAttending,
                    checkinAt: newAttending ? new Date() : null,
                    createdBy: currentUser.userId,
                },
                create: {
                    sessionId,
                    playerId: player.id,
                    attending: newAttending,
                    checkinAt: newAttending ? new Date() : null,
                    createdBy: currentUser.userId,
                },
                include: {
                    player: { select: { id: true, fullName: true, type: true } },
                },
            });

            return { attendance, attending: newAttending, playerName: player.fullName, cancelReason };
        });

        // Log cancel reason notification for admin
        if (action === "cancel" && cancelReason) {
            logger.warn(
                "cancel-checkin",
                `⚠️ ${result.playerName} hủy điểm danh buổi tập ${sessionId}. Lý do: ${cancelReason}`
            );
        }

        logger.info(
            "self-checkin",
            `User ${currentUser.userId} đã ${result.attending ? "điểm danh" : "hủy điểm danh"} buổi tập ${sessionId}`
        );

        return NextResponse.json({
            attendance: result.attendance,
            attending: result.attending,
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case "SESSION_NOT_FOUND":
                    return NextResponse.json({ error: "Không tìm thấy buổi tập" }, { status: 404 });
                case "SESSION_CLOSED":
                    return NextResponse.json({ error: "Buổi tập đã đóng" }, { status: 400 });
                case "SESSION_FULL":
                    return NextResponse.json({ error: "Buổi tập đã đủ người" }, { status: 400 });
                case "PLAYER_NOT_FOUND":
                    return NextResponse.json(
                        { error: "Bạn chưa được thêm vào danh sách người chơi. Vui lòng liên hệ quản trị viên." },
                        { status: 400 }
                    );
                case "CANCEL_TOO_LATE":
                    return NextResponse.json(
                        { error: "Không thể hủy điểm danh trong vòng 1 giờ trước khi bắt đầu buổi tập." },
                        { status: 400 }
                    );
                case "CANCEL_REASON_REQUIRED":
                    return NextResponse.json(
                        { error: "Vui lòng nhập lý do hủy điểm danh." },
                        { status: 400 }
                    );
            }
        }
        return handleAuthError(error);
    }
}
