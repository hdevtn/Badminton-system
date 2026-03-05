"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/utils";
import { Clock, MapPin, Users, DollarSign, Check, X, Loader2, UserCheck } from "lucide-react";

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
        player: { id: string; fullName: string; type: string; userId?: string };
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

    // Tự điểm danh / hủy điểm danh cho member
    async function handleSelfCheckin(action?: "checkin" | "cancel") {
        setSelfCheckinLoading(true);
        try {
            const res = await fetch(`/api/sessions/${params.id}/self-checkin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: action || "checkin" }),
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
                <Loader2 className="h-8 w-8 animate-spin text-[#A5C838]" />
            </div>
        );
    }

    if (!session) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <h3 className="text-lg font-medium text-[#233630]">Không tìm thấy buổi tập</h3>
                </CardContent>
            </Card>
        );
    }

    const attendingCount = session.attendances.filter((a) => a.attending).length;
    const isAdmin = user?.role === "ADMIN";

    // Kiểm tra xem user hiện tại đã điểm danh chưa
    const myAttendance = session.attendances.find(a => {
        return (a.player as any).userId === user?.id;
    });
    const isCheckedIn = myAttendance?.attending === true;

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
                    <h1 className="text-2xl font-bold text-[#E3E3D7]">{session.court.name}</h1>
                    <p className="text-[#E3E3D7]/50">{formatDateTime(session.startAt)}</p>
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

            {/* Nút điểm danh / hủy điểm danh */}
            {session.status === "OPEN" && (
                <Card className="!bg-[#233630] !text-[#E3E3D7] border-[#A5C838]/15">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <UserCheck className="h-5 w-5 text-[#A5C838]" />
                            <div>
                                <p className="font-medium text-[#E3E3D7]">
                                    {isCheckedIn ? "Bạn đã điểm danh" : "Điểm danh buổi tập"}
                                </p>
                                <p className="text-sm text-[#E3E3D7]/50">
                                    {isCheckedIn ? "Bấm hủy nếu không tham gia" : "Xác nhận tham gia buổi tập"}
                                </p>
                            </div>
                        </div>
                        {isCheckedIn ? (
                            <button
                                onClick={() => handleSelfCheckin("cancel")}
                                disabled={selfCheckinLoading}
                                className="flex items-center gap-2 h-10 px-5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {selfCheckinLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )}
                                Hủy điểm danh
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSelfCheckin("checkin")}
                                disabled={selfCheckinLoading}
                                className="flex items-center gap-2 h-10 px-5 rounded-lg bg-[#A5C838] text-[#233630] font-semibold hover:bg-[#b5d448] transition-colors shadow-lg shadow-[#A5C838]/20 disabled:opacity-50"
                            >
                                {selfCheckinLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Điểm danh
                            </button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Thẻ thông tin */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#046839]/15 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-[#046839]" />
                        </div>
                        <div>
                            <p className="text-xs text-[#233630]/50">Thời gian</p>
                            <p className="font-semibold text-[#233630]">{formatTime(session.startAt)} - {formatTime(session.endAt)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#A5C838]/15 flex items-center justify-center">
                            <Users className="h-5 w-5 text-[#A5C838]" />
                        </div>
                        <div>
                            <p className="text-xs text-[#233630]/50">Người tham gia</p>
                            <p className="font-semibold text-[#233630]">{attendingCount} / {session.court.maxCheckin}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#046839]/15 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-[#046839]" />
                        </div>
                        <div>
                            <p className="text-xs text-[#233630]/50">Phí sân</p>
                            <p className="font-semibold text-[#233630]">{formatCurrency(session.courtFee)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#A5C838]/15 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-[#A5C838]" />
                        </div>
                        <div>
                            <p className="text-xs text-[#233630]/50">Phí cầu</p>
                            <p className="font-semibold text-[#233630]">{formatCurrency(session.shuttleFee)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng điểm danh - BỎ CỘT THAO TÁC */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg text-[#233630]">Điểm danh</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#233630]/10">
                                <TableHead className="text-[#233630]/60">Người chơi</TableHead>
                                <TableHead className="text-[#233630]/60">Loại</TableHead>
                                <TableHead className="text-[#233630]/60 text-center w-20">Trạng thái</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {session.attendances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-[#233630]/40 py-8">
                                        Chưa có ai điểm danh
                                    </TableCell>
                                </TableRow>
                            ) : (
                                session.attendances.map((att) => (
                                    <TableRow key={att.id} className="border-[#233630]/5">
                                        <TableCell className="font-medium text-[#233630]">{att.player.fullName}</TableCell>
                                        <TableCell>
                                            <Badge variant={att.player.type === "FIXED" ? "default" : "warning"}>
                                                {att.player.type === "FIXED" ? "Cố định" : "Vãng lai"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {att.attending ? (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#046839]">
                                                    <Check className="h-4 w-4 text-white" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#233630]/10">
                                                    <X className="h-4 w-4 text-[#233630]/30" />
                                                </span>
                                            )}
                                        </TableCell>
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
                        <CardTitle className="text-lg text-[#233630]">Chi phí</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#233630]/10">
                                    <TableHead className="text-[#233630]/60">Người chơi</TableHead>
                                    <TableHead className="text-[#233630]/60">Loại chi phí</TableHead>
                                    <TableHead className="text-right text-[#233630]/60">Số tiền</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {session.charges.map((charge) => (
                                    <TableRow key={charge.id} className="border-[#233630]/5">
                                        <TableCell className="font-medium text-[#233630]">{charge.player.fullName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{getChargeLabel(charge.type)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-[#233630]">
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
