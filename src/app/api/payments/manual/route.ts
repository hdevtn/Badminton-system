import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { manualPaymentSchema } from "@/lib/validations";
import { Decimal } from "@prisma/client/runtime/library";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        const parsed = manualPaymentSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { invoiceId, amount, refCode } = parsed.data;
        const note = body.note || null;

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

        try {
            const result = await prisma.$transaction(async (tx) => {
                const invoice = await tx.invoice.findUnique({
                    where: { id: invoiceId },
                    include: { payments: true, player: { select: { id: true, fullName: true } } },
                });

                if (!invoice) {
                    throw new Error("INVOICE_NOT_FOUND");
                }

                // Tạo thanh toán
                const payment = await tx.payment.create({
                    data: {
                        invoiceId,
                        amountDecimal: new Decimal(amount),
                        method: "MANUAL",
                        refCode,
                        status: "SUCCESS",
                        note,
                    },
                });

                // Tính tổng đã thanh toán
                const totalPaid = invoice.payments
                    .filter(p => p.status === "SUCCESS")
                    .reduce((sum, p) => sum + Number(p.amountDecimal), 0) + amount;

                const totalInvoice = Number(invoice.totalDecimal);

                // Cập nhật trạng thái hóa đơn
                let newStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";
                if (totalPaid >= totalInvoice) {
                    newStatus = "PAID";
                } else if (totalPaid > 0) {
                    newStatus = "PARTIAL";
                }

                await tx.invoice.update({
                    where: { id: invoiceId },
                    data: { status: newStatus },
                });

                // Ghi payment log - THÀNH CÔNG
                await tx.paymentLog.create({
                    data: {
                        playerId: invoice.playerId,
                        invoiceId,
                        action: "MANUAL_PAYMENT",
                        amount: new Decimal(amount),
                        method: "MANUAL",
                        refCode,
                        status: "SUCCESS",
                        ip,
                    },
                });

                return { payment, newStatus, playerName: invoice.player.fullName };
            });

            logger.info("payments", `Thanh toán thủ công: ${amount} cho hóa đơn ${invoiceId}`);
            return NextResponse.json(result, { status: 201 });

        } catch (error) {
            // Ghi payment log - THẤT BẠI
            await prisma.paymentLog.create({
                data: {
                    invoiceId,
                    action: "MANUAL_PAYMENT",
                    amount: new Decimal(amount),
                    method: "MANUAL",
                    refCode,
                    status: "FAILED",
                    errorMsg: error instanceof Error ? error.message : "Lỗi không xác định",
                    ip,
                },
            });

            if (error instanceof Error && error.message === "INVOICE_NOT_FOUND") {
                return NextResponse.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });
            }
            throw error;
        }
    } catch (error) {
        return handleAuthError(error);
    }
}
