"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/utils";
import { ClipboardList, ChevronLeft, ChevronRight, Loader2, Eye } from "lucide-react";
import Link from "next/link";

interface SessionItem {
    id: string;
    startAt: string;
    endAt: string;
    courtFee: string;
    shuttleFee: string;
    passStatus: string;
    status: string;
    court: { name: string; location: string };
    _count: { attendances: number };
}

export default function AdminSessionsPage() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    useEffect(() => {
        fetchSessions();
    }, [currentMonth]);

    async function fetchSessions() {
        setLoading(true);
        try {
            const res = await fetch(`/api/sessions?month=${currentMonth}`);
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch {
            toast("Không thể tải danh sách buổi tập");
        } finally {
            setLoading(false);
        }
    }

    const navigateMonth = (direction: number) => {
        const [y, m] = currentMonth.split("-").map(Number);
        const date = new Date(y, m - 1 + direction, 1);
        setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    };

    const [year, month] = currentMonth.split("-").map(Number);
    const monthName = new Date(year, month - 1).toLocaleString("vi-VN", { month: "long", year: "numeric" });

    return (
        <div className="space-y-6">
            {/* Tiêu đề */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ClipboardList className="h-6 w-6" />
                        Quản lý buổi tập
                    </h1>
                    <p className="text-muted-foreground">Danh sách các buổi tập trong tháng</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-[160px] text-center capitalize">{monthName}</span>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Bảng buổi tập */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Danh sách buổi tập</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-12">
                            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">Chưa có buổi tập nào trong tháng này</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sân</TableHead>
                                    <TableHead>Ngày</TableHead>
                                    <TableHead>Thời gian</TableHead>
                                    <TableHead>Phí sân</TableHead>
                                    <TableHead>Phí cầu</TableHead>
                                    <TableHead>Người</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.court.name}</TableCell>
                                        <TableCell>{new Date(s.startAt).toLocaleDateString("vi-VN")}</TableCell>
                                        <TableCell>
                                            {formatTime(s.startAt)} - {formatTime(s.endAt)}
                                        </TableCell>
                                        <TableCell className="font-mono">{formatCurrency(s.courtFee)}</TableCell>
                                        <TableCell className="font-mono">{formatCurrency(s.shuttleFee)}</TableCell>
                                        <TableCell>
                                            <Badge variant={s._count.attendances >= 4 ? "default" : "warning"}>
                                                {s._count.attendances}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={s.status === "OPEN" ? "success" : "secondary"}>
                                                {s.status === "OPEN" ? "Đang mở" : "Đã đóng"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/sessions/${s.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Xem
                                                </Button>
                                            </Link>
                                        </TableCell>
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
