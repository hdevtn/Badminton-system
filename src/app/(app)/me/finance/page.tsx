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
import { DollarSign, TrendingUp, TrendingDown, Receipt, Loader2, QrCode, CreditCard, Copy, Check } from "lucide-react";
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
        <div className="space-y-6 pb-20 lg:pb-6">
            <div>
                <h1 className="text-2xl font-bold">Tài chính cá nhân</h1>
                <p className="text-muted-foreground">Tổng hợp chi phí và thanh toán</p>
            </div>

            {/* Thẻ tổng quan */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng phải trả</p>
                                <p className="text-2xl font-bold mt-1">{formatCurrency(totalBilled)}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Receipt className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Đã đóng</p>
                                <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalPaid)}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Công nợ</p>
                                <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(totalOwed)}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <TrendingDown className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng hóa đơn */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5" /> Hóa đơn
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
                                                    <Link href={`/invoices/${inv.id}`} className="text-primary hover:underline font-medium">
                                                        {inv.periodYyyyMm}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="font-mono">{formatCurrency(inv.totalDecimal)}</TableCell>
                                                <TableCell className="font-mono text-green-600">{formatCurrency(paid)}</TableCell>
                                                <TableCell className="font-mono text-red-600">{formatCurrency(remaining)}</TableCell>
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
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openQRPayment(inv.id)}
                                                            disabled={qrLoading}
                                                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white"
                                                        >
                                                            {qrLoading ? (
                                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                            ) : (
                                                                <QrCode className="h-4 w-4 mr-1" />
                                                            )}
                                                            QR
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog QR Thanh toán */}
            <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg">Quét mã QR để thanh toán</DialogTitle>
                    </DialogHeader>
                    {qrDialog && (
                        <div className="space-y-4">
                            {/* QR Image */}
                            <div className="flex justify-center">
                                <div className="rounded-xl overflow-hidden border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                                    <img
                                        src={qrDialog.qrUrl}
                                        alt="QR Thanh toán"
                                        className="w-64 h-64 object-contain bg-white"
                                    />
                                </div>
                            </div>

                            {/* Thông tin CK */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ngân hàng</span>
                                    <span className="font-semibold">{qrDialog.bankInfo.bankName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Số TK</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-semibold">{qrDialog.bankInfo.accountNo}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAccount}>
                                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Chủ TK</span>
                                    <span className="font-semibold">{qrDialog.bankInfo.accountName}</span>
                                </div>
                                <div className="border-t pt-2 mt-2"></div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Số tiền</span>
                                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                        {formatCurrency(qrDialog.amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Nội dung CK</span>
                                    <span className="font-mono text-xs">{qrDialog.description}</span>
                                </div>
                            </div>

                            <p className="text-xs text-center text-muted-foreground">
                                Mở app ngân hàng → Quét QR → Thanh toán sẽ được cập nhật tự động
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
