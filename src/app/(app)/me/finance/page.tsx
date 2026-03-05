"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, Receipt, Loader2, QrCode, Copy, Check, Wallet, ChevronRight, X, Smartphone, ExternalLink } from "lucide-react";
import Link from "next/link";

interface InvoiceCharge {
    id: string;
    type: string;
    amountDecimal: string;
    session?: { startAt: string; court?: { name: string } };
}

interface Invoice {
    id: string;
    periodYyyyMm: string;
    totalDecimal: string;
    status: string;
    createdAt: string;
    payments: { amountDecimal: string; status: string }[];
    charges?: InvoiceCharge[];
}

interface QRData {
    qrUrl: string;
    bankInfo: { bankName: string; accountNo: string; accountName: string };
    amount: number;
    description: string;
    invoiceId: string;
    playerName: string;
    period: string;
    totalAmount: number;
    paidAmount: number;
}

export default function FinancePage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrDialog, setQrDialog] = useState<QRData | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [detailDialog, setDetailDialog] = useState<Invoice | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    async function fetchInvoices() {
        try {
            const res = await fetch("/api/invoices");
            const data = await res.json();
            setInvoices(data.invoices || []);
        } catch {
            toast("Không thể tải thông tin tài chính");
        } finally {
            setLoading(false);
        }
    }

    async function openInvoiceDetail(inv: Invoice) {
        setDetailDialog(inv);
        // Fetch charges if not present
        if (!inv.charges) {
            setDetailLoading(true);
            try {
                const res = await fetch(`/api/invoices/${inv.id}`);
                const data = await res.json();
                if (data.invoice) {
                    setDetailDialog({ ...inv, charges: data.invoice.charges || [] });
                }
            } catch {
                // silent
            } finally {
                setDetailLoading(false);
            }
        }
    }

    async function openQRPayment(invoiceId: string) {
        setQrLoading(true);
        try {
            const res = await fetch(`/api/invoices/${invoiceId}/qr`);
            const data = await res.json();
            if (res.ok && data.qrUrl) {
                setQrDialog(data);
            } else {
                toast(data.error || "Lỗi tạo QR");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setQrLoading(false);
        }
    }

    function openDirectPayment(qrData: QRData) {
        // Deep link to banking app via VietQR
        const url = `https://dl.vietqr.io/pay?app=vietqr&ba=${qrData.bankInfo.accountNo}&bn=${encodeURIComponent(qrData.bankInfo.accountName)}&am=${qrData.amount}&tn=${encodeURIComponent(qrData.description)}`;
        window.open(url, "_blank");
    }

    async function handleCopyAccount() {
        if (qrDialog) {
            await navigator.clipboard.writeText(qrDialog.bankInfo.accountNo);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    const totalOwed = invoices
        .filter((i) => i.status !== "PAID")
        .reduce((sum, i) => sum + Number(i.totalDecimal), 0);

    const totalPaid = invoices.reduce(
        (sum, i) => sum + i.payments.filter(p => p.status === "SUCCESS").reduce((ps, p) => ps + Number(p.amountDecimal), 0),
        0
    );

    const totalBilled = invoices.reduce((sum, i) => sum + Number(i.totalDecimal), 0);

    function getChargeLabel(type: string) {
        switch (type) {
            case "FIXED": return "Cố định";
            case "GUEST": return "Vãng lai";
            case "ADJUSTMENT": return "Điều chỉnh";
            case "DELTA": return "Chênh lệch";
            default: return type;
        }
    }

    function getPaidAmount(inv: Invoice) {
        return inv.payments.filter(p => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amountDecimal), 0);
    }

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#E3E3D7] flex items-center gap-2">
                    <Wallet className="h-7 w-7 text-[#A5C838]" />
                    Tài chính cá nhân
                </h1>
                <p className="text-[#E3E3D7]/50 mt-1">Tổng hợp chi phí và thanh toán</p>
            </div>

            {/* Thẻ tổng quan */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#F9FFE4] p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[#233630]/60">Tổng phải trả</p>
                            <p className="text-3xl font-bold text-[#233630] mt-2">{formatCurrency(totalBilled)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-[#046839]/10 flex items-center justify-center">
                            <Receipt className="h-6 w-6 text-[#046839]" />
                        </div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-[#233630]/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#046839] transition-all duration-500" style={{ width: totalBilled > 0 ? "100%" : "0%" }} />
                    </div>
                </div>

                <div className="rounded-2xl bg-[#F9FFE4] p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[#233630]/60">Đã đóng</p>
                            <p className="text-3xl font-bold text-[#046839] mt-2">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-[#A5C838]/15 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-[#A5C838]" />
                        </div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-[#233630]/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#A5C838] transition-all duration-500" style={{ width: totalBilled > 0 ? `${(totalPaid / totalBilled * 100)}%` : "0%" }} />
                    </div>
                </div>

                <div className="rounded-2xl bg-[#F9FFE4] p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[#233630]/60">Công nợ</p>
                            <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(totalOwed)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <TrendingDown className="h-6 w-6 text-red-500" />
                        </div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-[#233630]/10 overflow-hidden">
                        <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: totalBilled > 0 ? `${(totalOwed / totalBilled * 100)}%` : "0%" }} />
                    </div>
                </div>
            </div>

            {/* Hóa đơn dạng Card */}
            <div>
                <h2 className="text-lg font-bold text-[#E3E3D7] mb-3 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-[#A5C838]" />
                    Hóa đơn
                </h2>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#046839]" />
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="text-center py-12 text-[#E3E3D7]/30">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>Chưa có hóa đơn nào</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {invoices.map((inv) => {
                            const paid = getPaidAmount(inv);
                            const remaining = Number(inv.totalDecimal) - paid;
                            const paidPercent = Number(inv.totalDecimal) > 0 ? (paid / Number(inv.totalDecimal) * 100) : 0;
                            return (
                                <div
                                    key={inv.id}
                                    onClick={() => openInvoiceDetail(inv)}
                                    className="rounded-xl bg-[#F9FFE4] p-4 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-[#233630]">
                                                Kỳ {inv.periodYyyyMm}
                                            </span>
                                            <Badge
                                                variant={inv.status === "PAID" ? "success" : inv.status === "PARTIAL" ? "warning" : "destructive"}
                                            >
                                                {inv.status === "PAID" ? "Đã đóng" : inv.status === "PARTIAL" ? "Một phần" : "Chưa đóng"}
                                            </Badge>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-[#233630]/30" />
                                    </div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-[#233630]/50">Tổng: <strong className="text-[#233630]">{formatCurrency(inv.totalDecimal)}</strong></span>
                                        <span className="text-[#233630]/50">Còn: <strong className="text-red-600">{formatCurrency(remaining)}</strong></span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-[#233630]/10 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${paidPercent >= 100 ? "bg-[#046839]" : paidPercent > 0 ? "bg-[#A5C838]" : "bg-red-400"}`}
                                            style={{ width: `${Math.min(paidPercent, 100)}%` }}
                                        />
                                    </div>
                                    {inv.status !== "PAID" && (
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openQRPayment(inv.id); }}
                                                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#046839] text-white text-sm font-medium hover:bg-[#057843] transition-colors"
                                            >
                                                <QrCode className="h-4 w-4" /> Tạo QR
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Open direct payment
                                                    const desc = `CL ${inv.id.slice(-8).toUpperCase()} T${inv.periodYyyyMm.replace("-", "")}`;
                                                    openDirectPayment({
                                                        qrUrl: "",
                                                        bankInfo: { bankName: "TPBank", accountNo: "53958686888", accountName: "DOAN MANH HUNG" },
                                                        amount: remaining,
                                                        description: desc,
                                                        invoiceId: inv.id,
                                                        playerName: "",
                                                        period: inv.periodYyyyMm,
                                                        totalAmount: Number(inv.totalDecimal),
                                                        paidAmount: paid,
                                                    });
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#A5C838] text-[#233630] text-sm font-semibold hover:bg-[#b5d448] transition-colors"
                                            >
                                                <Smartphone className="h-4 w-4" /> Thanh toán
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Dialog Chi tiết hóa đơn */}
            <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
                <DialogContent className="max-w-md !bg-[#233630] !text-[#E3E3D7] border-[#A5C838]/10 max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg text-[#E3E3D7]">
                            Chi tiết hóa đơn - Kỳ {detailDialog?.periodYyyyMm}
                        </DialogTitle>
                    </DialogHeader>
                    {detailDialog && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="bg-[#F9FFE4] rounded-xl p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#233630]/60 text-sm">Tổng tiền</span>
                                    <span className="font-bold text-lg text-[#233630]">{formatCurrency(detailDialog.totalDecimal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#233630]/60 text-sm">Đã đóng</span>
                                    <span className="font-bold text-[#046839]">{formatCurrency(getPaidAmount(detailDialog))}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-[#233630]/10 pt-2">
                                    <span className="text-[#233630]/60 text-sm">Còn lại</span>
                                    <span className="font-bold text-lg text-red-600">
                                        {formatCurrency(Number(detailDialog.totalDecimal) - getPaidAmount(detailDialog))}
                                    </span>
                                </div>
                            </div>

                            {/* Detail charges */}
                            {detailLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-[#A5C838]" />
                                </div>
                            ) : detailDialog.charges && detailDialog.charges.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-[#E3E3D7]/40 font-medium">Chi tiết phí</p>
                                    {detailDialog.charges.map((c) => (
                                        <div key={c.id} className="bg-[#1a2b26] rounded-lg px-3 py-2 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[#E3E3D7]">{getChargeLabel(c.type)}</p>
                                                {c.session && (
                                                    <p className="text-xs text-[#E3E3D7]/40">
                                                        {c.session.court?.name} - {new Date(c.session.startAt).toLocaleDateString("vi-VN")}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="font-mono font-semibold text-[#A5C838]">{formatCurrency(c.amountDecimal)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[#E3E3D7]/30 text-center py-4">Không có chi tiết</p>
                            )}

                            {/* Action buttons */}
                            {detailDialog.status !== "PAID" && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { openQRPayment(detailDialog.id); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[#046839] text-white text-sm font-medium"
                                    >
                                        <QrCode className="h-4 w-4" /> Tạo QR
                                    </button>
                                    <button
                                        onClick={() => {
                                            const remaining = Number(detailDialog.totalDecimal) - getPaidAmount(detailDialog);
                                            const desc = `CL ${detailDialog.id.slice(-8).toUpperCase()} T${detailDialog.periodYyyyMm.replace("-", "")}`;
                                            openDirectPayment({
                                                qrUrl: "",
                                                bankInfo: { bankName: "TPBank", accountNo: "53958686888", accountName: "DOAN MANH HUNG" },
                                                amount: remaining,
                                                description: desc,
                                                invoiceId: detailDialog.id,
                                                playerName: "",
                                                period: detailDialog.periodYyyyMm,
                                                totalAmount: Number(detailDialog.totalDecimal),
                                                paidAmount: getPaidAmount(detailDialog),
                                            });
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[#A5C838] text-[#233630] text-sm font-semibold"
                                    >
                                        <Smartphone className="h-4 w-4" /> Thanh toán
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog QR Thanh toán */}
            <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
                <DialogContent className="max-w-sm !bg-[#233630] !text-[#E3E3D7] border-[#A5C838]/10">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg text-[#E3E3D7]">Quét mã QR để thanh toán</DialogTitle>
                    </DialogHeader>
                    {qrDialog && (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <div className="rounded-xl overflow-hidden shadow-lg">
                                    <img src={qrDialog.qrUrl} alt="QR Thanh toán" className="w-64 h-auto object-contain bg-white" />
                                </div>
                            </div>

                            <div className="bg-[#F9FFE4] rounded-xl p-4 space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#233630]/60 font-medium">Ngân hàng</span>
                                    <span className="font-bold text-[#233630]">{qrDialog.bankInfo.bankName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#233630]/60 font-medium">Số TK</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-[#233630]">{qrDialog.bankInfo.accountNo}</span>
                                        <button onClick={handleCopyAccount} className="text-[#046839] hover:text-[#A5C838] transition-colors">
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#233630]/60 font-medium">Chủ TK</span>
                                    <span className="font-bold text-[#233630]">{qrDialog.bankInfo.accountName}</span>
                                </div>
                                <div className="border-t border-[#233630]/10 pt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#233630]/60 font-medium">Số tiền</span>
                                        <span className="font-bold text-xl text-[#046839]">{formatCurrency(qrDialog.amount)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#233630]/60 font-medium">Nội dung CK</span>
                                    <span className="font-mono text-xs text-[#233630]/80">{qrDialog.description}</span>
                                </div>
                            </div>

                            {/* Direct payment button for mobile */}
                            <button
                                onClick={() => openDirectPayment(qrDialog)}
                                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#A5C838] text-[#233630] font-bold text-sm hover:bg-[#b5d448] transition-colors"
                            >
                                <Smartphone className="h-4 w-4" />
                                Mở app ngân hàng thanh toán
                            </button>

                            <p className="text-xs text-center text-[#A5C838]/80">
                                Mở app ngân hàng → Quét QR → Thanh toán sẽ được cập nhật tự động
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
