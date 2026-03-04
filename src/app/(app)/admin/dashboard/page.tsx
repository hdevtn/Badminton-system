"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import {
    LayoutDashboard, DollarSign, Users, TrendingUp, TrendingDown,
    ChevronLeft, ChevronRight, Download, Loader2, Receipt
} from "lucide-react";

interface DashboardData {
    totalCourtFee: number;
    totalShuttleFee: number;
    totalPayments: number;
    totalOutstanding: number;
    totalDelta: number;
    sessions: {
        id: string;
        startAt: string;
        courtFee: string;
        shuttleFee: string;
        passStatus: string;
        court: { name: string };
        _count: { attendances: number };
    }[];
    invoices: {
        id: string;
        periodYyyyMm: string;
        totalDecimal: string;
        status: string;
        player: { fullName: string };
    }[];
}

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [sessions, setSessions] = useState<DashboardData["sessions"]>([]);
    const [invoices, setInvoices] = useState<DashboardData["invoices"]>([]);

    useEffect(() => {
        fetchData();
    }, [currentMonth]);

    async function fetchData() {
        setLoading(true);
        try {
            const [sessRes, invRes] = await Promise.all([
                fetch(`/api/sessions?month=${currentMonth}`),
                fetch(`/api/invoices?period=${currentMonth}`),
            ]);
            const sessData = await sessRes.json();
            const invData = await invRes.json();
            setSessions(sessData.sessions || []);
            setInvoices(invData.invoices || []);
        } catch {
            toast("Không thể tải dữ liệu bảng điều khiển");
        } finally {
            setLoading(false);
        }
    }

    const navigateMonth = (direction: number) => {
        const [y, m] = currentMonth.split("-").map(Number);
        const date = new Date(y, m - 1 + direction, 1);
        setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    };

    const totalCourtFee = sessions.reduce((s, sess) => s + Number(sess.courtFee), 0);
    const totalShuttleFee = sessions.reduce((s, sess) => s + Number(sess.shuttleFee), 0);
    const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.totalDecimal), 0);
    const paidInvoices = invoices.filter(i => i.status === "PAID");
    const unpaidInvoices = invoices.filter(i => i.status !== "PAID");
    const passSuccessCount = sessions.filter(s => s.passStatus === "SUCCESS").length;

    const [year, month] = currentMonth.split("-").map(Number);
    const monthName = new Date(year, month - 1).toLocaleString("vi-VN", { month: "long", year: "numeric" });

    async function exportCsv() {
        const headers = ["Sân", "Ngày", "Phí sân", "Phí cầu", "Pass", "Số người"];
        const rows = sessions.map(s => [
            s.court.name,
            new Date(s.startAt).toLocaleDateString("vi-VN"),
            s.courtFee,
            s.shuttleFee,
            s.passStatus,
            s._count.attendances,
        ]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bao-cao-${currentMonth}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast("Đã xuất file CSV");
    }

    return (
        <div className="space-y-6">
            {/* Tiêu đề */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6" />
                        Bảng điều khiển
                    </h1>
                    <p className="text-muted-foreground">Tổng quan hoạt động cầu lông theo tháng</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-[160px] text-center capitalize">{monthName}</span>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportCsv}>
                        <Download className="mr-2 h-4 w-4" /> CSV
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Thẻ thống kê */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tổng phí sân</p>
                                        <p className="text-2xl font-bold mt-1">{formatCurrency(totalCourtFee)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Pass thành công: {passSuccessCount} buổi</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <DollarSign className="h-6 w-6 text-blue-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tổng phí cầu</p>
                                        <p className="text-2xl font-bold mt-1">{formatCurrency(totalShuttleFee)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{sessions.length} buổi tập</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                        <Receipt className="h-6 w-6 text-purple-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tổng hóa đơn</p>
                                        <p className="text-2xl font-bold mt-1">{formatCurrency(totalInvoiced)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{paidInvoices.length} đã đóng / {invoices.length}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                        <TrendingUp className="h-6 w-6 text-green-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-amber-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Công nợ</p>
                                        <p className="text-2xl font-bold mt-1">
                                            {formatCurrency(unpaidInvoices.reduce((s, i) => s + Number(i.totalDecimal), 0))}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">{unpaidInvoices.length} hóa đơn chưa đóng</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        <TrendingDown className="h-6 w-6 text-amber-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bảng buổi tập trong tháng */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Buổi tập trong tháng</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sessions.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Chưa có buổi tập nào</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sân</TableHead>
                                            <TableHead>Ngày</TableHead>
                                            <TableHead>Phí sân</TableHead>
                                            <TableHead>Phí cầu</TableHead>
                                            <TableHead>Pass</TableHead>
                                            <TableHead>Người</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessions.slice(0, 20).map((s) => (
                                            <TableRow key={s.id}>
                                                <TableCell className="font-medium">{s.court.name}</TableCell>
                                                <TableCell>{new Date(s.startAt).toLocaleDateString("vi-VN")}</TableCell>
                                                <TableCell className="font-mono">{formatCurrency(s.courtFee)}</TableCell>
                                                <TableCell className="font-mono">{formatCurrency(s.shuttleFee)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={s.passStatus === "SUCCESS" ? "success" : "outline"}>
                                                        {s.passStatus === "SUCCESS" ? "Thành công" : s.passStatus === "FAILED" ? "Thất bại" : s.passStatus}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={s._count.attendances >= 4 ? "default" : "warning"}>
                                                        {s._count.attendances}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Bảng hóa đơn */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Hóa đơn</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {invoices.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Chưa có hóa đơn nào</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Người chơi</TableHead>
                                            <TableHead>Kỳ</TableHead>
                                            <TableHead>Số tiền</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((inv) => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-medium">{inv.player.fullName}</TableCell>
                                                <TableCell>{inv.periodYyyyMm}</TableCell>
                                                <TableCell className="font-mono">{formatCurrency(inv.totalDecimal)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={inv.status === "PAID" ? "success" : inv.status === "PARTIAL" ? "warning" : "destructive"}>
                                                        {inv.status === "PAID" ? "Đã đóng" : inv.status === "PARTIAL" ? "Một phần" : "Chưa đóng"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
