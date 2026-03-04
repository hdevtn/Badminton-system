/**
 * Thư viện Zalo OAuth 2.0 + PKCE
 * ============================================================
 * Triển khai luồng đăng nhập Zalo theo Zalo Social API v4:
 *   1. Tạo code_verifier + code_challenge (PKCE)
 *   2. Chuyển hướng người dùng sang trang xác thực Zalo
 *   3. Đổi authorization_code -> access_token (kèm code_verifier)
 *   4. Lấy thông tin người dùng từ Zalo Graph API
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

// ============================================================
// CẤU HÌNH
// ============================================================

const ZALO_APP_ID = process.env.ZALO_APP_ID || "";
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET || "";
const ZALO_CALLBACK_URL =
    process.env.ZALO_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/zalo/callback`;

// Các endpoint của Zalo OAuth (v4)
const ZALO_AUTH_URL = "https://oauth.zaloapp.com/v4/permission";
const ZALO_TOKEN_URL = "https://oauth.zaloapp.com/v4/access_token";
const ZALO_GRAPH_URL = "https://graph.zalo.me/v2.0/me";

// ============================================================
// HỖ TRỢ PKCE (RFC 7636)
// ============================================================

/**
 * Tạo code_verifier ngẫu nhiên 43 ký tự (a-zA-Z0-9)
 * Zalo yêu cầu code_verifier là chuỗi ngẫu nhiên 43 ký tự
 */
export function generateCodeVerifier(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const randomBytes = crypto.randomBytes(43);
    for (let i = 0; i < 43; i++) {
        result += chars[randomBytes[i] % chars.length];
    }
    return result;
}

/**
 * Tạo code_challenge từ code_verifier bằng SHA-256 + Base64 URL-safe (không padding)
 */
export function generateCodeChallenge(codeVerifier: string): string {
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    return hash
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

/**
 * Tạo state token ngẫu nhiên để chống CSRF
 */
export function generateState(): string {
    return crypto.randomBytes(16).toString("hex");
}

// ============================================================
// LUỒNG OAUTH
// ============================================================

/**
 * Tạo URL chuyển hướng sang trang đăng nhập Zalo
 */
export function getZaloAuthUrl(codeChallenge: string, state: string): string {
    if (!ZALO_APP_ID) {
        throw new Error("ZALO_APP_ID chưa được cấu hình trong .env");
    }

    const params = new URLSearchParams({
        app_id: ZALO_APP_ID,
        redirect_uri: ZALO_CALLBACK_URL,
        code_challenge: codeChallenge,
        state,
    });

    return `${ZALO_AUTH_URL}?${params.toString()}`;
}

// ============================================================
// ĐỔI MÃ XÁC THỰC
// ============================================================

export interface ZaloTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

/**
 * Đổi authorization_code -> access_token
 */
export async function exchangeCodeForToken(
    authorizationCode: string,
    codeVerifier: string
): Promise<ZaloTokenResponse> {
    if (!ZALO_APP_ID || !ZALO_APP_SECRET) {
        throw new Error("ZALO_APP_ID hoặc ZALO_APP_SECRET chưa được cấu hình");
    }

    logger.info("zalo-oauth", "Đang đổi mã xác thực lấy access token...");

    const response = await fetch(ZALO_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            secret_key: ZALO_APP_SECRET,
        },
        body: new URLSearchParams({
            code: authorizationCode,
            app_id: ZALO_APP_ID,
            grant_type: "authorization_code",
            code_verifier: codeVerifier,
        }),
    });

    const data = await response.json();

    if (data.error || data.error_name) {
        const errMsg =
            data.error_description ||
            data.error_reason ||
            data.error_name ||
            "Lỗi đổi access token từ Zalo";
        logger.error("zalo-oauth", `Đổi token thất bại: ${errMsg}`, data);
        throw new Error(errMsg);
    }

    if (!data.access_token) {
        logger.error("zalo-oauth", "Phản hồi Zalo thiếu access_token", data);
        throw new Error("Không nhận được access_token từ Zalo");
    }

    logger.info("zalo-oauth", "Nhận access token thành công");
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in || 3600,
    };
}

// ============================================================
// THÔNG TIN NGƯỜI DÙNG
// ============================================================

export interface ZaloUserInfo {
    id: string;
    name: string;
    picture?: {
        data?: {
            url?: string;
        };
    };
}

/**
 * Lấy thông tin cơ bản của người dùng từ Zalo Graph API
 */
export async function getZaloUserInfo(accessToken: string): Promise<ZaloUserInfo> {
    logger.info("zalo-oauth", "Đang lấy thông tin người dùng Zalo...");

    const response = await fetch(`${ZALO_GRAPH_URL}?fields=id,name,picture`, {
        headers: {
            access_token: accessToken,
        },
    });

    const data = await response.json();

    if (data.error) {
        const errMsg = data.error.message || "Lỗi lấy thông tin người dùng từ Zalo";
        logger.error("zalo-oauth", `Lấy thông tin thất bại: ${errMsg}`, data.error);
        throw new Error(errMsg);
    }

    if (!data.id) {
        logger.error("zalo-oauth", "Phản hồi Zalo thiếu id người dùng", data);
        throw new Error("Không lấy được thông tin người dùng từ Zalo");
    }

    logger.info("zalo-oauth", `Thông tin Zalo: id=${data.id}, tên=${data.name}`);
    return {
        id: data.id,
        name: data.name || "Người dùng Zalo",
        picture: data.picture,
    };
}

// ============================================================
// KIỂM TRA CẤU HÌNH
// ============================================================

/**
 * Kiểm tra Zalo Login đã được cấu hình đúng chưa
 */
export function isZaloLoginConfigured(): boolean {
    return !!(ZALO_APP_ID && ZALO_APP_SECRET);
}

/**
 * Lấy callback URL hiện tại
 */
export function getCallbackUrl(): string {
    return ZALO_CALLBACK_URL;
}
