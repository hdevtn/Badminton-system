"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar as CalendarIcon,
    Clock,
    Users,
    MapPin,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Loader2,
    Zap,
} from "lucide-react";
import { formatCurrency, formatTime, formatDate } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";

interface Session {
    id: string;
    startAt: string;
    endAt: string;
    courtFee: string;
    shuttleFee: string;
    passStatus: string;
    status: string;
    court: { name: string; location: string; maxCheckin: number };
    _count: { attendances: number };
}

type SessionTimeStatus = "past" | "today" | "upcoming" | "future";

function getSessionTimeStatus(startAt: string, endAt: string): SessionTimeStatus {
    const now = new Date();
    const start = new Date(startAt);
    const end = new Date(endAt);

    // Lấy ngày (bỏ giờ) để so sánh
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    if (end < now) return "past";
    if (sessionDay.getTime() === today.getTime()) return "today";

    // Tính số ngày còn lại
    const diffDays = Math.ceil((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return "upcoming";
    return "future";
}

function getSessionStyle(timeStatus: SessionTimeStatus, sessionStatus: string) {
    if (sessionStatus === "CLOSED") {
        return {
            card: "opacity-60 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50",
            dot: "bg-slate-400",
            badge: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
            label: "Đã đóng",
        };
    }

    switch (timeStatus) {
        case "past":
            return {
                card: "opacity-50 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30",
                dot: "bg-slate-400",
                badge: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                label: "Đã qua",
            };
        case "today":
            return {
                card: "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 ring-2 ring-emerald-400/30",
                dot: "bg-emerald-500 animate-pulse",
                badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
                label: "Hôm nay 🔥",
            };
        case "upcoming":
            return {
                card: "border-cyan-300 dark:border-cyan-600 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20 shadow-md shadow-cyan-100 dark:shadow-cyan-900/20 hover:shadow-lg",
                dot: "bg-cyan-500",
                badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
                label: "Sắp tới",
            };
        case "future":
        default:
            return {
                card: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md",
                dot: "bg-teal-400",
                badge: "bg-teal-50 text-teal-600 dark:bg-teal-900/50 dark:text-teal-300",
                label: "Lịch tới",
            };
    }
}

export default function CalendarPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selfCheckinLoading, setSelfCheckinLoading] = useState<string | null>(null);
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
            toast("Không thể tải lịch");
        } finally {
            setLoading(false);
        }
    }

    async function handleQuickCheckin(sessionId: string) {
        setSelfCheckinLoading(sessionId);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/self-checkin`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                toast(data.attending ? "Đã điểm danh! 🎉" : "Đã hủy điểm danh");
                fetchSessions();
            } else {
                toast(data.error || "Lỗi điểm danh");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setSelfCheckinLoading(null);
        }
    }

    const navigateMonth = (direction: number) => {
        const [y, m] = currentMonth.split("-").map(Number);
        const date = new Date(y, m - 1 + direction, 1);
        setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    };

    // Sắp xếp: hôm nay/sắp tới trước, đã qua cuối
    const sortedSessions = [...sessions].sort((a, b) => {
        const aStatus = getSessionTimeStatus(a.startAt, a.endAt);
        const bStatus = getSessionTimeStatus(b.startAt, b.endAt);
        const priority: Record<SessionTimeStatus, number> = { today: 0, upcoming: 1, future: 2, past: 3 };
        if (priority[aStatus] !== priority[bStatus]) return priority[aStatus] - priority[bStatus];
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });

    // Nhóm buổi tập theo status
    const grouped = {
        today: sortedSessions.filter(s => getSessionTimeStatus(s.startAt, s.endAt) === "today"),
        upcoming: sortedSessions.filter(s => getSessionTimeStatus(s.startAt, s.endAt) === "upcoming"),
        future: sortedSessions.filter(s => getSessionTimeStatus(s.startAt, s.endAt) === "future"),
        past: sortedSessions.filter(s => getSessionTimeStatus(s.startAt, s.endAt) === "past" || s.status === "CLOSED"),
    };

    const getPassLabel = (status: string) => {
        switch (status) {
            case "SUCCESS": return "Thành công";
            case "FAILED": return "Thất bại";
            case "TRYING": return "Đang thử";
            default: return "Chưa";
        }
    };

    const [year, month] = currentMonth.split("-").map(Number);
    const monthName = new Date(year, month - 1).toLocaleString("vi-VN", { month: "long", year: "numeric" });

    const renderSessionCard = (session: Session) => {
        const timeStatus = getSessionTimeStatus(session.startAt, session.endAt);
        const style = getSessionStyle(timeStatus, session.status);
        const isToday = timeStatus === "today";
        const canCheckin = session.status === "OPEN" && (timeStatus === "today" || timeStatus === "upcoming");

        return (
            <Card key={session.id} className={`transition-all duration-300 ${style.card}`}>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                            <span className="font-semibold text-sm">{session.court.name}</span>
                        </div>
                        <Badge className={`text-[10px] px-2 py-0.5 ${style.badge}`}>
                            {style.label}
                        </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">{formatDate(session.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{formatTime(session.startAt)} - {formatTime(session.endAt)}</span>
                        </div>
                        {session.court.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{session.court.location}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            <span>{session._count.attendances}/{session.court.maxCheckin} người</span>
                        </div>
                    </div>

                    {/* Footer: phí + nút */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2 text-xs">
                            {Number(session.courtFee) > 0 && (
                                <span className="text-muted-foreground">
                                    Sân: {formatCurrency(session.courtFee)}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            {canCheckin && (
                                <Button
                                    size="sm"
                                    variant={isToday ? "default" : "outline"}
                                    className={isToday
                                        ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 text-white text-xs h-7 px-3 shadow-md"
                                        : "text-xs h-7 px-3"
                                    }
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleQuickCheckin(session.id);
                                    }}
                                    disabled={selfCheckinLoading === session.id}
                                >
                                    {selfCheckinLoading === session.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Điểm danh
                                        </>
                                    )}
                                </Button>
                            )}
                            <Link href={`/sessions/${session.id}`}>
                                <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
                                    Chi tiết
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderSection = (title: string, icon: React.ReactNode, items: Session[], emptyMsg?: string) => {
        if (items.length === 0 && !emptyMsg) return null;
        return (
            <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {icon} {title}
                </h3>
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground/50 pl-6">{emptyMsg}</p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map(renderSessionCard)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20 lg:pb-6">
            {/* Tiêu đề */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Lịch sân cầu lông</h1>
                    <p className="text-muted-foreground text-sm">Xem lịch, điểm danh và theo dõi buổi tập</p>
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

            {/* Chú thích màu */}
            <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Hôm nay</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    <span>Sắp tới</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                    <span>Lịch tới</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span>Đã qua</span>
                </div>
            </div>

            {/* Danh sách buổi tập */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                                <div className="h-3 bg-muted rounded w-1/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">Chưa có lịch</h3>
                        <p className="text-muted-foreground">Tháng này chưa có buổi tập nào</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {renderSection(
                        "Hôm nay",
                        <Zap className="h-4 w-4 text-emerald-500" />,
                        grouped.today,
                        "Hôm nay không có buổi tập"
                    )}
                    {renderSection(
                        "Sắp tới (3 ngày)",
                        <CalendarIcon className="h-4 w-4 text-cyan-500" />,
                        grouped.upcoming
                    )}
                    {renderSection(
                        "Lịch trong tháng",
                        <CalendarIcon className="h-4 w-4 text-teal-400" />,
                        grouped.future
                    )}
                    {grouped.past.length > 0 && renderSection(
                        "Đã qua",
                        <Clock className="h-4 w-4 text-slate-400" />,
                        grouped.past
                    )}
                </div>
            )}
        </div>
    );
}
