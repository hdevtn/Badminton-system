/**
 * GET /api/auth/zalo/callback
 * Xử lý callback từ Zalo sau khi người dùng cấp quyền
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { exchangeCodeForToken, getZaloUserInfo } from "@/lib/zalo-oauth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Người dùng từ chối cấp quyền hoặc Zalo trả về lỗi
    if (errorParam || !code) {
        const msg = errorReason || errorParam || "Người dùng từ chối đăng nhập";
        logger.warn("zalo-callback", `Zalo xác thực bị từ chối: ${msg}`);
        return NextResponse.redirect(
            `${appUrl}/login?error=${encodeURIComponent("Đăng nhập Zalo thất bại: " + msg)}`
        );
    }

    try {
        // Kiểm tra state token chống CSRF
        const session = await getSession();
        const savedState = (session as any).zaloState;
        const savedCodeVerifier = (session as any).zaloCodeVerifier;

        if (!savedState || !savedCodeVerifier) {
            logger.error("zalo-callback", "Phiên đăng nhập thiếu dữ liệu xác thực");
            return NextResponse.redirect(
                `${appUrl}/login?error=${encodeURIComponent("Phiên đăng nhập hết hạn. Vui lòng thử lại.")}`
            );
        }

        if (state !== savedState) {
            logger.error("zalo-callback", `State không khớp: expected=${savedState.substring(0, 8)}..., got=${state?.substring(0, 8)}...`);
            return NextResponse.redirect(
                `${appUrl}/login?error=${encodeURIComponent("Yêu cầu không hợp lệ. Vui lòng thử lại.")}`
            );
        }

        // Xóa PKCE data khỏi session (chỉ sử dụng 1 lần)
        delete (session as any).zaloState;
        delete (session as any).zaloCodeVerifier;

        // Đổi authorization_code -> access_token
        const tokenData = await exchangeCodeForToken(code, savedCodeVerifier);

        // Lấy thông tin người dùng từ Zalo
        const zaloUser = await getZaloUserInfo(tokenData.access_token);
        const avatarUrl = zaloUser.picture?.data?.url || null;

        logger.info("zalo-callback", `Người dùng Zalo: id=${zaloUser.id}, tên=${zaloUser.name}`);

        // Tìm hoặc tạo user trong cơ sở dữ liệu
        let user = await prisma.user.findUnique({
            where: { zaloId: zaloUser.id },
            include: { player: true },
        });

        if (!user) {
            // Chưa có user với zaloId này -> tạo mới
            const phonePlaceholder = `zalo_${zaloUser.id}`;

            user = await prisma.user.create({
                data: {
                    phone: phonePlaceholder,
                    name: zaloUser.name,
                    zaloId: zaloUser.id,
                    avatarUrl,
                    role: "MEMBER",
                    status: "ACTIVE",
                },
                include: { player: true },
            });

            // Tạo player tương ứng
            await prisma.player.create({
                data: {
                    userId: user.id,
                    fullName: zaloUser.name,
                    type: "FIXED",
                    active: true,
                },
            });

            logger.info("zalo-callback", `Đã tạo người dùng mới từ Zalo: ${user.id}`);
        } else {
            // Cập nhật tên và avatar từ Zalo (nếu thay đổi)
            if (user.name !== zaloUser.name || user.avatarUrl !== avatarUrl) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        name: zaloUser.name,
                        avatarUrl,
                    },
                });
            }
            logger.info("zalo-callback", `Người dùng hiện tại đăng nhập qua Zalo: ${user.id}`);
        }

        // Kiểm tra trạng thái tài khoản
        if (user.status === "INACTIVE") {
            return NextResponse.redirect(
                `${appUrl}/login?error=${encodeURIComponent("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.")}`
            );
        }

        // Tạo session đăng nhập
        session.userId = user.id;
        session.phone = user.phone;
        session.role = user.role;
        session.isLoggedIn = true;
        await session.save();

        // Ghi log xác thực
        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";
        await prisma.authLog.create({
            data: {
                userId: user.id,
                phone: user.phone,
                ip,
                userAgent: req.headers.get("user-agent"),
                action: "ZALO_LOGIN",
            },
        });

        logger.info("zalo-callback", `Đăng nhập Zalo thành công: userId=${user.id}, quyền=${user.role}`);

        // Chuyển hướng - nếu phone là placeholder (zalo_xxx) thì yêu cầu nhập SĐT
        const needsPhone = user.phone.startsWith("zalo_");
        if (needsPhone) {
            return NextResponse.redirect(`${appUrl}/complete-profile`);
        }
        const redirectUrl = user.role === "ADMIN" ? "/admin/dashboard" : "/calendar";
        return NextResponse.redirect(`${appUrl}${redirectUrl}`);

    } catch (error: any) {
        logger.error("zalo-callback", "Lỗi xử lý callback Zalo", error?.message);
        return NextResponse.redirect(
            `${appUrl}/login?error=${encodeURIComponent("Lỗi đăng nhập Zalo. Vui lòng thử lại.")}`
        );
    }
}
