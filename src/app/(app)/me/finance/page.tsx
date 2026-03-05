"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, Receipt, Loader2, QrCode, CreditCard, Copy, Check, Wallet } from "lucide-react";
import Link from "next/link";

interface Invoice {
    id: string;
    periodYyyyMm: string;
    totalDecimal: string;
    status: string;
    createdAt: string;
    payments: { amountDecimal: string; status: string }[];
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

            {/* Thẻ tổng quan - Redesigned */}
            <div className="grid gap-4 sm:grid-cols-3">
                {/* Tổng phải trả */}
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
                        <div
                            className="h-full rounded-full bg-[#046839] transition-all duration-500"
                            style={{ width: totalBilled > 0 ? "100%" : "0%" }}
                        />
                    </div>
                </div>

                {/* Đã đóng */}
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
                        <div
                            className="h-full rounded-full bg-[#A5C838] transition-all duration-500"
                            style={{ width: totalBilled > 0 ? `${(totalPaid / totalBilled * 100)}%` : "0%" }}
                        />
                    </div>
                </div>

                {/* Công nợ */}
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
                        <div
                            className="h-full rounded-full bg-red-500 transition-all duration-500"
                            style={{ width: totalBilled > 0 ? `${(totalOwed / totalBilled * 100)}%` : "0%" }}
                        />
                    </div>
                </div>
            </div>

            {/* Bảng hóa đơn */}
            <div className="rounded-2xl bg-[#F9FFE4] shadow-sm overflow-hidden">
                <div className="p-5 pb-3 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#046839]" />
                    <h2 className="text-lg font-bold text-[#233630]">Hóa đơn</h2>
                </div>
                <div className="px-5 pb-5">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-[#046839]" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-8 text-[#233630]/40">
                            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Chưa có hóa đơn nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kỳ</TableHead>
                                        <TableHead>Tổng tiền</TableHead>
                                        <TableHead>Đã đóng</TableHead>
                                        <TableHead>Còn lại</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="text-right">Thanh toán</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((inv) => {
                                        const paid = inv.payments
                                            .filter(p => p.status === "SUCCESS")
                                            .reduce((s, p) => s + Number(p.amountDecimal), 0);
                                        const remaining = Number(inv.totalDecimal) - paid;
                                        return (
                                            <TableRow key={inv.id}>
                                                <TableCell>
                                                    <Link href={`/invoices/${inv.id}`} className="text-[#046839] hover:underline font-semibold">
                                                        {inv.periodYyyyMm}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="font-mono text-[#233630]">{formatCurrency(inv.totalDecimal)}</TableCell>
                                                <TableCell className="font-mono text-[#046839] font-semibold">{formatCurrency(paid)}</TableCell>
                                                <TableCell className="font-mono text-red-600 font-semibold">{formatCurrency(remaining)}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            inv.status === "PAID" ? "success" : inv.status === "PARTIAL" ? "warning" : "destructive"
                                                        }
                                                    >
                                                        {inv.status === "PAID" ? "Đã đóng" : inv.status === "PARTIAL" ? "Một phần" : "Chưa đóng"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {inv.status !== "PAID" && (
                                                        <button
                                                            onClick={() => openQRPayment(inv.id)}
                                                            disabled={qrLoading}
                                                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#046839] text-white font-medium text-sm hover:bg-[#057843] transition-colors disabled:opacity-50"
                                                        >
                                                            {qrLoading ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <QrCode className="h-4 w-4" />
                                                            )}
                                                            QR
                                                        </button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog QR Thanh toán - Redesigned */}
            <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
                <DialogContent className="max-w-sm !bg-[#233630] !text-[#E3E3D7] border-[#A5C838]/10">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg text-[#E3E3D7]">Quét mã QR để thanh toán</DialogTitle>
                    </DialogHeader>
                    {qrDialog && (
                        <div className="space-y-4">
                            {/* QR Image */}
                            <div className="flex justify-center">
                                <div className="rounded-xl overflow-hidden shadow-lg">
                                    <img
                                        src={qrDialog.qrUrl}
                                        alt="QR Thanh toán"
                                        className="w-64 h-auto object-contain bg-white"
                                    />
                                </div>
                            </div>

                            {/* Thông tin CK - Styled like image */}
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
                                        <span className="font-bold text-xl text-[#046839]">
                                            {formatCurrency(qrDialog.amount)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#233630]/60 font-medium">Nội dung CK</span>
                                    <span className="font-mono text-xs text-[#233630]/80">{qrDialog.description}</span>
                                </div>
                            </div>

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
