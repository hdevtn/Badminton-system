import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { logger } from "@/lib/logger";

// POST /api/admin/zalo-notify - Gửi tin nhắn đến nhóm Zalo
export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        const { type, message, sessionId, invoiceId } = body;

        if (!message || !type) {
            return NextResponse.json(
                { error: "Thiếu nội dung tin nhắn hoặc loại thông báo" },
                { status: 400 }
            );
        }

        // Lấy Zalo OA Access Token từ settings
        const zaloToken = process.env.ZALO_OA_ACCESS_TOKEN;
        const zaloGroupId = process.env.ZALO_GROUP_ID;

        if (!zaloToken) {
            // Log và trả lời vì chưa cấu hình
            logger.warn("zalo-notify", "Chưa cấu hình ZALO_OA_ACCESS_TOKEN");
            return NextResponse.json({
                success: false,
                error: "Chưa cấu hình Zalo OA. Vui lòng thêm ZALO_OA_ACCESS_TOKEN vào .env",
                fallback: true,
                message: message, // Trả lại nội dung để admin copy thủ công
            });
        }

        try {
            // Gửi qua Zalo OA API
            const zaloRes = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "access_token": zaloToken,
                },
                body: JSON.stringify({
                    recipient: { user_id: zaloGroupId },
                    message: {
                        text: message,
                    },
                }),
            });

            const zaloData = await zaloRes.json();

            if (zaloData.error !== 0) {
                logger.error("zalo-notify", `Gửi thất bại: ${JSON.stringify(zaloData)}`);
                return NextResponse.json({
                    success: false,
                    error: `Zalo API lỗi: ${zaloData.message || "Không rõ"}`,
                    fallback: true,
                    message,
                });
            }

            logger.info("zalo-notify", `Gửi thành công: type=${type}`);
            return NextResponse.json({ success: true });

        } catch (apiError) {
            logger.error("zalo-notify", "Lỗi gọi Zalo API", apiError);
            return NextResponse.json({
                success: false,
                error: "Không thể kết nối Zalo API",
                fallback: true,
                message,
            });
        }

    } catch (error) {
        return handleAuthError(error);
    }
}
