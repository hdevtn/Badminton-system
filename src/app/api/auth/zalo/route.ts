/**
 * GET /api/auth/zalo
 * Khởi tạo luồng đăng nhập Zalo (OAuth 2.0 + PKCE)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
    generateCodeVerifier,
    generateCodeChallenge,
    generateState,
    getZaloAuthUrl,
    isZaloLoginConfigured,
} from "@/lib/zalo-oauth";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    try {
        // Kiểm tra cấu hình Zalo Login
        if (!isZaloLoginConfigured()) {
            logger.error("zalo-auth", "Zalo Login chưa được cấu hình (thiếu ZALO_APP_ID / ZALO_APP_SECRET)");
            return NextResponse.json(
                { error: "Chức năng đăng nhập Zalo chưa được cấu hình. Vui lòng liên hệ quản trị viên." },
                { status: 503 }
            );
        }

        // Tạo PKCE code_verifier + code_challenge
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);

        // Tạo state token ngẫu nhiên chống CSRF
        const state = generateState();

        // Lưu vào session để xác thực khi Zalo callback
        const session = await getSession();
        (session as any).zaloCodeVerifier = codeVerifier;
        (session as any).zaloState = state;
        await session.save();

        logger.info("zalo-auth", `Khởi tạo đăng nhập Zalo, state=${state.substring(0, 8)}...`);

        // Chuyển hướng sang trang đăng nhập Zalo
        const authUrl = getZaloAuthUrl(codeChallenge, state);
        return NextResponse.redirect(authUrl);

    } catch (error: any) {
        logger.error("zalo-auth", "Lỗi khởi tạo đăng nhập Zalo", error?.message);
        return NextResponse.json(
            { error: "Lỗi khởi tạo đăng nhập Zalo. Vui lòng thử lại." },
            { status: 500 }
        );
    }
}
