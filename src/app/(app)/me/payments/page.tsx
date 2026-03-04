"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Loader2, Receipt, TrendingUp } from "lucide-react";

interface PaymentRecord {
    id: string;
    amountDecimal: string;
    method: string;
    paidAt: string;
    refCode: string | null;
    status: string;
    invoice: {
        id: string;
        periodYyyyMm: string;
        totalDecimal: string;
        status: string;
    };
}

export default function PaymentHistoryPage() {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    async function fetchPayments() {
        try {
            const res = await fetch("/api/me/payments");
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
            } else {
                toast("Không thể tải lịch sử thanh toán");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    }

    const totalPaid = payments
        .filter((p) => p.status === "SUCCESS")
        .reduce((sum, p) => sum + Number(p.amountDecimal), 0);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SUCCESS":
                return <Badge variant="success">Thành công</Badge>;
            case "PENDING":
                return <Badge variant="warning">Đang xử lý</Badge>;
            case "FAILED":
                return <Badge variant="destructive">Thất bại</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case "VIETQR":
                return "VietQR";
            case "MANUAL":
                return "Thanh toán thủ công";
            default:
                return method;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Tiêu đề */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard className="h-6 w-6" />
                    Lịch sử thanh toán
                </h1>
                <p className="text-muted-foreground">Xem lại các khoản đã thanh toán</p>
            </div>

            {/* Thẻ tổng quan */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng đã thanh toán</p>
                                <p className="text-2xl font-bold mt-1">{formatCurrency(totalPaid)}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Số lần thanh toán</p>
                                <p className="text-2xl font-bold mt-1">{payments.filter((p) => p.status === "SUCCESS").length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Receipt className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng lịch sử */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Chi tiết các khoản thanh toán</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12">
                            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium mb-2">Chưa có thanh toán</h3>
                            <p className="text-muted-foreground">Bạn chưa có khoản thanh toán nào</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ngày thanh toán</TableHead>
                                    <TableHead>Kỳ</TableHead>
                                    <TableHead>Số tiền</TableHead>
                                    <TableHead>Phương thức</TableHead>
                                    <TableHead>Mã tham chiếu</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            {new Date(payment.paidAt).toLocaleDateString("vi-VN", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </TableCell>
                                        <TableCell>{payment.invoice.periodYyyyMm}</TableCell>
                                        <TableCell className="font-mono font-semibold">
                                            {formatCurrency(payment.amountDecimal)}
                                        </TableCell>
                                        <TableCell>{getMethodLabel(payment.method)}</TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {payment.refCode || "—"}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
