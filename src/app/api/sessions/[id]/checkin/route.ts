import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/session";
import { checkinSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const currentUser = await requireAuth();

        const body = await req.json();
        const parsed = checkinSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const sessionId = params.id;
        const { playerId, attending } = parsed.data;

        // Sử dụng transaction để đảm bảo tính toàn vẹn
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

            // Kiểm tra số lượng tối đa khi điểm danh
            if (attending) {
                const currentCount = await tx.attendance.count({
                    where: {
                        sessionId,
                        attending: true,
                        NOT: { playerId },
                    },
                });

                if (currentCount >= session.court.maxCheckin) {
                    throw new Error("SESSION_FULL");
                }
            }

            // Upsert điểm danh
            const attendance = await tx.attendance.upsert({
                where: {
                    sessionId_playerId: { sessionId, playerId },
                },
                update: {
                    attending,
                    checkinAt: attending ? new Date() : null,
                    createdBy: currentUser.userId,
                },
                create: {
                    sessionId,
                    playerId,
                    attending,
                    checkinAt: attending ? new Date() : null,
                    createdBy: currentUser.userId,
                },
                include: {
                    player: { select: { id: true, fullName: true, type: true } },
                },
            });

            return attendance;
        });

        logger.info("checkin", `Người chơi ${playerId} đã ${attending ? "điểm danh" : "hủy điểm danh"} buổi tập ${sessionId}`);

        return NextResponse.json({ attendance: result });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case "SESSION_NOT_FOUND":
                    return NextResponse.json({ error: "Không tìm thấy buổi tập" }, { status: 404 });
                case "SESSION_CLOSED":
                    return NextResponse.json({ error: "Buổi tập đã đóng" }, { status: 400 });
                case "SESSION_FULL":
                    return NextResponse.json({ error: "Buổi tập đã đủ người" }, { status: 400 });
            }
        }
        return handleAuthError(error);
    }
}
