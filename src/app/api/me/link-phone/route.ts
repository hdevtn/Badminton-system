/**
 * POST /api/me/link-phone
 * Liên kết số điện thoại thật cho user đăng nhập qua Zalo
 * - Nếu SĐT đã tồn tại trong hệ thống → merge Zalo user vào user cũ
 * - Nếu SĐT chưa có → cập nhật phone cho user hiện tại
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError, getSession } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const currentUser = await requireAuth();
        const { phone } = await req.json();

        // Validate SĐT
        const cleanPhone = phone?.replace(/\s+/g, "").replace(/^(\+84|84)/, "0");
        if (!cleanPhone || !/^0\d{8,10}$/.test(cleanPhone)) {
            return NextResponse.json(
                { error: "Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam (VD: 0912345678)" },
                { status: 400 }
            );
        }

        // Kiểm tra user hiện tại có phải đang dùng phone placeholder không
        const currentDbUser = await prisma.user.findUnique({
            where: { id: currentUser.userId },
            include: { player: true },
        });

        if (!currentDbUser) {
            return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
        }

        if (!currentDbUser.phone.startsWith("zalo_")) {
            return NextResponse.json(
                { error: "Tài khoản đã có số điện thoại" },
                { status: 400 }
            );
        }

        // Kiểm tra SĐT đã được sử dụng bởi user khác chưa
        const existingUser = await prisma.user.findUnique({
            where: { phone: cleanPhone },
            include: { player: true },
        });

        if (existingUser) {
            // Merge: chuyển zaloId + avatar sang user cũ, xóa user zalo tạm
            await prisma.$transaction(async (tx) => {
                // Cập nhật zaloId và avatar cho user cũ
                await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        zaloId: currentDbUser.zaloId,
                        avatarUrl: currentDbUser.avatarUrl || existingUser.avatarUrl,
                        name: currentDbUser.name || existingUser.name,
                    },
                });

                // Xóa player tạm của zalo user (nếu có)
                if (currentDbUser.player) {
                    // Chuyển attendance records sang player cũ nếu có
                    if (existingUser.player) {
                        await tx.attendance.updateMany({
                            where: { playerId: currentDbUser.player.id },
                            data: { playerId: existingUser.player.id },
                        });
                    }
                    await tx.player.delete({ where: { id: currentDbUser.player.id } });
                }

                // Xóa user zalo tạm
                await tx.user.delete({ where: { id: currentDbUser.id } });

                logger.info("link-phone", `Merged Zalo user ${currentDbUser.id} into existing user ${existingUser.id} (${cleanPhone})`);
            });

            // Cập nhật session sang user cũ
            const session = await getSession();
            session.userId = existingUser.id;
            session.phone = existingUser.phone;
            session.role = existingUser.role;
            await session.save();

            return NextResponse.json({
                success: true,
                merged: true,
                message: "Đã liên kết tài khoản Zalo với SĐT có sẵn trong hệ thống!",
                user: {
                    id: existingUser.id,
                    phone: existingUser.phone,
                    name: currentDbUser.name || existingUser.name,
                    role: existingUser.role,
                },
            });
        } else {
            // SĐT mới - cập nhật phone cho user hiện tại
            const updatedUser = await prisma.user.update({
                where: { id: currentDbUser.id },
                data: { phone: cleanPhone },
            });

            // Cập nhật session
            const session = await getSession();
            session.phone = cleanPhone;
            await session.save();

            logger.info("link-phone", `Updated phone for Zalo user ${currentDbUser.id}: ${cleanPhone}`);

            return NextResponse.json({
                success: true,
                merged: false,
                message: "Đã cập nhật số điện thoại thành công!",
                user: {
                    id: updatedUser.id,
                    phone: updatedUser.phone,
                    name: updatedUser.name,
                    role: updatedUser.role,
                },
            });
        }
    } catch (error) {
        logger.error("link-phone", "Lỗi liên kết SĐT", (error as any)?.message);
        return handleAuthError(error);
    }
}
