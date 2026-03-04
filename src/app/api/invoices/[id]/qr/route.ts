import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateVietQRUrl, generateTransferDescription, BANK_INFO } from "@/lib/vietqr";

// GET /api/invoices/[id]/qr - Lấy thông tin QR thanh toán
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            include: {
                player: { select: { id: true, fullName: true } },
                payments: { select: { amountDecimal: true, status: true } },
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });
        }

        // Tính số tiền còn lại
        const paidAmount = invoice.payments
            .filter(p => p.status === "SUCCESS")
            .reduce((sum, p) => sum + Number(p.amountDecimal), 0);
        const remainingAmount = Math.max(0, Number(invoice.totalDecimal) - paidAmount);

        if (remainingAmount <= 0) {
            return NextResponse.json({
                error: "Hóa đơn đã thanh toán đầy đủ",
                status: "PAID"
            });
        }

        const description = generateTransferDescription({
            invoiceId: invoice.id,
            playerName: invoice.player.fullName,
            period: invoice.periodYyyyMm,
        });

        const qrUrl = generateVietQRUrl({
            amount: remainingAmount,
            description,
        });

        return NextResponse.json({
            qrUrl,
            bankInfo: BANK_INFO,
            amount: remainingAmount,
            description,
            invoiceId: invoice.id,
            playerName: invoice.player.fullName,
            period: invoice.periodYyyyMm,
            totalAmount: Number(invoice.totalDecimal),
            paidAmount,
        });
    } catch (error) {
        return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
    }
}
