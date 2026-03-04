"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/utils";
import { Clock, MapPin, Users, DollarSign, CheckCircle, XCircle, Loader2, UserCheck } from "lucide-react";

interface SessionDetail {
    id: string;
    startAt: string;
    endAt: string;
    courtFee: string;
    shuttleFee: string;
    passStatus: string;
    status: string;
    court: { name: string; location: string; maxCheckin: number };
    attendances: {
        id: string;
        attending: boolean;
        player: { id: string; fullName: string; type: string };
    }[];
    charges: {
        id: string;
        type: string;
        amountDecimal: string;
        player: { id: string; fullName: string; type: string };
    }[];
}

export default function SessionDetailPage() {
    const params = useParams();
    const { user } = useAuth();
    const [session, setSession] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkinLoading, setCheckinLoading] = useState<string | null>(null);
    const [selfCheckinLoading, setSelfCheckinLoading] = useState(false);

    useEffect(() => {
        fetchSession();
    }, [params.id]);

    async function fetchSession() {
        try {
            const res = await fetch(`/api/sessions/${params.id}`);
            const data = await res.json();
            setSession(data.session);
        } catch {
            toast("Không thể tải thông tin buổi tập");
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckin(playerId: string, attending: boolean) {
        setCheckinLoading(playerId);
        try {
            const res = await fetch(`/api/sessions/${params.id}/checkin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerId, attending }),
            });
            const data = await res.json();
            if (res.ok) {
                toast(attending ? "Đã điểm danh thành công" : "Đã hủy điểm danh");
                fetchSession();
            } else {
                toast(data.error || "Lỗi điểm danh");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setCheckinLoading(null);
        }
    }

    // Tự điểm danh cho member
    async function handleSelfCheckin() {
        setSelfCheckinLoading(true);
        try {
            const res = await fetch(`/api/sessions/${params.id}/self-checkin`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                toast(data.attending ? "Đã điểm danh thành công! 🎉" : "Đã hủy điểm danh");
                fetchSession();
            } else {
                toast(data.error || "Lỗi điểm danh");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setSelfCheckinLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <h3 className="text-lg font-medium">Không tìm thấy buổi tập</h3>
                </CardContent>
            </Card>
        );
    }

    const attendingCount = session.attendances.filter((a) => a.attending).length;
    const isAdmin = user?.role === "ADMIN";

    // Kiểm tra xem user hiện tại đã điểm danh chưa
    const myAttendance = session.attendances.find(a => {
        // Tìm attendance theo user
        return (a.player as any).userId === user?.id;
    });

    const getChargeLabel = (type: string) => {
        switch (type) {
            case "FIXED": return "Cố định";
            case "GUEST": return "Vãng lai";
            case "ADJUSTMENT": return "Điều chỉnh";
            case "DELTA": return "Chênh lệch";
            default: return type;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Tiêu đề */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{session.court.name}</h1>
                    <p className="text-muted-foreground">{formatDateTime(session.startAt)}</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant={session.status === "OPEN" ? "success" : "secondary"}>
                        {session.status === "OPEN" ? "Đang mở" : "Đã đóng"}
                    </Badge>
                    <Badge variant={session.passStatus === "SUCCESS" ? "success" : "outline"}>
                        Pass: {session.passStatus === "SUCCESS" ? "Thành công" : session.passStatus === "FAILED" ? "Thất bại" : session.passStatus === "TRYING" ? "Đang thử" : "Chưa"}
                    </Badge>
                </div>
            </div>

            {/* Nút tự điểm danh cho member */}
            {session.status === "OPEN" && (
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <UserCheck className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="font-medium">Điểm danh buổi tập</p>
                                <p className="text-sm text-muted-foreground">Xác nhận tham gia buổi tập hôm nay</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleSelfCheckin}
                            disabled={selfCheckinLoading}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white"
                        >
                            {selfCheckinLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Điểm danh
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Thẻ thông tin */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Thời gian</p>
                            <p className="font-semibold">{formatTime(session.startAt)} - {formatTime(session.endAt)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Người tham gia</p>
                            <p className="font-semibold">{attendingCount} / {session.court.maxCheckin}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Phí sân</p>
                            <p className="font-semibold">{formatCurrency(session.courtFee)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Phí cầu</p>
                            <p className="font-semibold">{formatCurrency(session.shuttleFee)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng điểm danh */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Điểm danh</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Người chơi</TableHead>
                                <TableHead>Loại</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                {isAdmin && <TableHead className="text-right">Thao tác</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {session.attendances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                                        Chưa có ai điểm danh
                                    </TableCell>
                                </TableRow>
                            ) : (
                                session.attendances.map((att) => (
                                    <TableRow key={att.id}>
                                        <TableCell className="font-medium">{att.player.fullName}</TableCell>
                                        <TableCell>
                                            <Badge variant={att.player.type === "FIXED" ? "default" : "warning"}>
                                                {att.player.type === "FIXED" ? "Cố định" : "Vãng lai"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {att.attending ? (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="h-4 w-4" /> Có mặt
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <XCircle className="h-4 w-4" /> Vắng
                                                </span>
                                            )}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell className="text-right">
                                                {session.status === "OPEN" && (
                                                    <Button
                                                        variant={att.attending ? "outline" : "default"}
                                                        size="sm"
                                                        disabled={checkinLoading === att.player.id}
                                                        onClick={() => handleCheckin(att.player.id, !att.attending)}
                                                    >
                                                        {checkinLoading === att.player.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : att.attending ? (
                                                            "Hủy"
                                                        ) : (
                                                            "Điểm danh"
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Chi phí */}
            {session.charges.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Chi phí</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Người chơi</TableHead>
                                    <TableHead>Loại chi phí</TableHead>
                                    <TableHead className="text-right">Số tiền</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {session.charges.map((charge) => (
                                    <TableRow key={charge.id}>
                                        <TableCell className="font-medium">{charge.player.fullName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{getChargeLabel(charge.type)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatCurrency(charge.amountDecimal)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
