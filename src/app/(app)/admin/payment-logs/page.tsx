"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { ScrollText, Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PaymentLog {
    id: string;
    playerId: string | null;
    invoiceId: string | null;
    action: string;
    amount: number | null;
    method: string | null;
    refCode: string | null;
    status: string;
    errorMsg: string | null;
    ip: string | null;
    playerName: string | null;
    createdAt: string;
}

export default function AdminPaymentLogsPage() {
    const [logs, setLogs] = useState<PaymentLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState("ALL");

    useEffect(() => {
        fetchLogs();
    }, [page, statusFilter]);

    async function fetchLogs() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), perPage: "30" });
            if (statusFilter !== "ALL") params.append("status", statusFilter);

            const res = await fetch(`/api/admin/payment-logs?${params}`);
            const data = await res.json();
            setLogs(data.logs || []);
            setTotalPages(data.totalPages || 1);
            setTotal(data.total || 0);
        } catch {
            toast("Lỗi tải log thanh toán");
        } finally {
            setLoading(false);
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "SUCCESS": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "FAILED": return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <AlertCircle className="h-4 w-4 text-amber-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SUCCESS": return <Badge variant="success">Thành công</Badge>;
            case "FAILED": return <Badge variant="destructive">Thất bại</Badge>;
            case "PENDING": return <Badge variant="warning">Đang xử lý</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case "MANUAL_PAYMENT": return "Thủ công";
            case "VIETQR_PAYMENT": return "VietQR";
            case "AUTO_VERIFY": return "Tự động";
            default: return action;
        }
    };

    const successCount = logs.filter(l => l.status === "SUCCESS").length;
    const failedCount = logs.filter(l => l.status === "FAILED").length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ScrollText className="h-6 w-6" /> Log thanh toán
                    </h1>
                    <p className="text-muted-foreground">Theo dõi tất cả giao dịch thanh toán</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả</SelectItem>
                            <SelectItem value="SUCCESS">Thành công</SelectItem>
                            <SelectItem value="FAILED">Thất bại</SelectItem>
                            <SelectItem value="PENDING">Đang xử lý</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tổng quan */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Tổng giao dịch</p>
                        <p className="text-2xl font-bold">{total}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Trang này - Thành công</p>
                        <p className="text-2xl font-bold text-green-600">{successCount}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Trang này - Thất bại</p>
                        <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng log */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Chưa có log thanh toán nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[140px]">Thời gian</TableHead>
                                        <TableHead>Người chơi</TableHead>
                                        <TableHead>Hành động</TableHead>
                                        <TableHead>Số tiền</TableHead>
                                        <TableHead>Phương thức</TableHead>
                                        <TableHead>Mã GD</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead>Lỗi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id} className={log.status === "FAILED" ? "bg-red-50/30 dark:bg-red-950/10" : ""}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(log.createdAt).toLocaleString("vi-VN", {
                                                    day: "2-digit", month: "2-digit",
                                                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                                                })}
                                            </TableCell>
                                            <TableCell className="font-medium">{log.playerName || "—"}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {getActionLabel(log.action)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                {log.amount ? formatCurrency(log.amount) : "—"}
                                            </TableCell>
                                            <TableCell className="text-xs">{log.method || "—"}</TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {log.refCode || "—"}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                                            <TableCell className="text-xs text-red-500 max-w-[200px] truncate" title={log.errorMsg || ""}>
                                                {log.errorMsg || "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Phân trang */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Trước
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Trang {page}/{totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        Sau <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
}
