"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    if (end < now) return "past";
    if (sessionDay.getTime() === today.getTime()) return "today";
    const diffDays = Math.ceil((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return "upcoming";
    return "future";
}

function getSessionStyle(timeStatus: SessionTimeStatus, sessionStatus: string) {
    if (sessionStatus === "CLOSED") {
        return {
            card: "opacity-40 bg-[#1a2b26] border-[#A5C838]/5",
            dot: "bg-[#E3E3D7]/30",
            badge: "bg-[#E3E3D7]/10 text-[#E3E3D7]/40",
            label: "Đã đóng",
            textColor: "text-[#E3E3D7]/40",
        };
    }

    switch (timeStatus) {
        case "past":
            return {
                card: "opacity-40 bg-[#1a2b26] border-[#E3E3D7]/5",
                dot: "bg-[#E3E3D7]/30",
                badge: "bg-[#E3E3D7]/10 text-[#E3E3D7]/40",
                label: "Đã qua",
                textColor: "text-[#E3E3D7]/40",
            };
        case "today":
            return {
                card: "bg-[#E3E3D7] border-[#A5C838]/30 shadow-xl shadow-[#A5C838]/10 ring-2 ring-[#A5C838]/20",
                dot: "bg-[#A5C838] animate-pulse",
                badge: "bg-[#A5C838] text-[#233630] font-bold",
                label: "Hôm nay 🔥",
                textColor: "text-[#233630]",
            };
        case "upcoming":
            return {
                card: "bg-[#E3E3D7]/90 border-[#046839]/20 shadow-lg shadow-[#046839]/10",
                dot: "bg-[#046839]",
                badge: "bg-[#046839] text-[#E3E3D7]",
                label: "Sắp tới",
                textColor: "text-[#233630]",
            };
        case "future":
        default:
            return {
                card: "bg-[#2a3f38] border-[#A5C838]/10 hover:border-[#A5C838]/20 hover:bg-[#2f4840]",
                dot: "bg-[#A5C838]/50",
                badge: "bg-[#A5C838]/15 text-[#A5C838]/80",
                label: "Lịch tới",
                textColor: "text-[#E3E3D7]/70",
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "checkin" }),
            });
            const data = await res.json();
            if (res.ok) {
                toast(data.message || "Điểm danh thành công!");
                fetchSessions();
            } else {
                toast(data.error || "Điểm danh thất bại");
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

    const sortedSessions = [...sessions].sort((a, b) => {
        const aStatus = getSessionTimeStatus(a.startAt, a.endAt);
        const bStatus = getSessionTimeStatus(b.startAt, b.endAt);
        const priority: Record<SessionTimeStatus, number> = { today: 0, upcoming: 1, future: 2, past: 3 };
        if (priority[aStatus] !== priority[bStatus]) return priority[aStatus] - priority[bStatus];
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });

    const grouped = {
        today: sortedSessions.filter(s => getSessionTimeStatus(s.startAt, s.endAt) === "today"),
        upcoming: sortedSessions.filter(s => getSessionTimeStatus(s.startAt, s.endAt) === "upcoming"),
        future: sortedSessions.filter(s => getSessionTimeStatus(s.startAt, s.endAt) === "future"),
        past: sortedSessions.filter(s => getSessionTimeStatus(s.startAt, s.endAt) === "past" || s.status === "CLOSED"),
    };

    const [year, month] = currentMonth.split("-").map(Number);
    const monthName = new Date(year, month - 1).toLocaleString("vi-VN", { month: "long", year: "numeric" });

    const renderSessionCard = (session: Session) => {
        const timeStatus = getSessionTimeStatus(session.startAt, session.endAt);
        const style = getSessionStyle(timeStatus, session.status);
        const isToday = timeStatus === "today";
        const isBeige = isToday || timeStatus === "upcoming";
        const canCheckin = session.status === "OPEN" && (timeStatus === "today" || timeStatus === "upcoming");

        return (
            <div key={session.id} className={`rounded-xl border p-4 transition-all duration-300 ${style.card}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                        <span className={`font-semibold text-sm ${isBeige ? "text-[#233630]" : "text-[#E3E3D7]"}`}>
                            {session.court.name}
                        </span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${style.badge}`}>
                        {style.label}
                    </span>
                </div>

                {/* Details */}
                <div className={`space-y-1.5 text-xs mb-3 ${isBeige ? "text-[#233630]/60" : "text-[#E3E3D7]/50"}`}>
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

                {/* Footer */}
                <div className={`flex items-center justify-between pt-3 border-t ${isBeige ? "border-[#233630]/10" : "border-[#E3E3D7]/10"}`}>
                    <div className="text-xs">
                        {Number(session.courtFee) > 0 && (
                            <span className={isBeige ? "text-[#233630]/40" : "text-[#E3E3D7]/30"}>
                                Sân: {formatCurrency(session.courtFee)}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-1.5">
                        {canCheckin && (
                            <button
                                onClick={(e) => { e.preventDefault(); handleQuickCheckin(session.id); }}
                                disabled={selfCheckinLoading === session.id}
                                className={`flex items-center gap-1 text-xs font-medium h-7 px-3 rounded-lg transition-all ${isToday
                                        ? "bg-[#A5C838] text-[#233630] hover:bg-[#b5d448] shadow-md shadow-[#A5C838]/20"
                                        : "bg-[#046839] text-[#E3E3D7] hover:bg-[#057843]"
                                    } disabled:opacity-50`}
                            >
                                {selfCheckinLoading === session.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="h-3 w-3" />
                                        Điểm danh
                                    </>
                                )}
                            </button>
                        )}
                        <Link href={`/sessions/${session.id}`}>
                            <button className={`text-xs h-7 px-2 rounded-lg transition-colors ${isBeige
                                    ? "text-[#233630]/50 hover:text-[#233630] hover:bg-[#233630]/5"
                                    : "text-[#E3E3D7]/40 hover:text-[#E3E3D7] hover:bg-[#E3E3D7]/5"
                                }`}>
                                Chi tiết →
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    };

    const renderSection = (title: string, icon: React.ReactNode, items: Session[], emptyMsg?: string) => {
        if (items.length === 0 && !emptyMsg) return null;
        return (
            <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#A5C838]/60 uppercase tracking-wider">
                    {icon} {title}
                </h3>
                {items.length === 0 ? (
                    <p className="text-sm text-[#E3E3D7]/20 pl-6">{emptyMsg}</p>
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#E3E3D7]">Lịch sân cầu lông</h1>
                    <p className="text-[#E3E3D7]/40 text-sm">Xem lịch, điểm danh và theo dõi buổi tập</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="w-9 h-9 rounded-lg border border-[#A5C838]/15 text-[#E3E3D7]/60 hover:text-[#A5C838] hover:border-[#A5C838]/30 flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-medium min-w-[160px] text-center capitalize text-[#E3E3D7]">{monthName}</span>
                    <button
                        onClick={() => navigateMonth(1)}
                        className="w-9 h-9 rounded-lg border border-[#A5C838]/15 text-[#E3E3D7]/60 hover:text-[#A5C838] hover:border-[#A5C838]/30 flex items-center justify-center transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-[#E3E3D7]/50">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#A5C838] animate-pulse" />
                    <span>Hôm nay</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#046839]" />
                    <span>Sắp tới</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#A5C838]/50" />
                    <span>Lịch tới</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#E3E3D7]/30" />
                    <span>Đã qua</span>
                </div>
            </div>

            {/* Sessions */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl bg-[#2a3f38] border border-[#A5C838]/5 p-6 animate-pulse">
                            <div className="h-4 bg-[#E3E3D7]/5 rounded w-3/4 mb-4" />
                            <div className="h-3 bg-[#E3E3D7]/5 rounded w-1/2 mb-2" />
                            <div className="h-3 bg-[#E3E3D7]/5 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="rounded-xl bg-[#2a3f38] border border-[#A5C838]/10 p-12 text-center">
                    <CalendarIcon className="h-12 w-12 mx-auto text-[#A5C838]/20 mb-4" />
                    <h3 className="text-lg font-medium text-[#E3E3D7]/60 mb-2">Chưa có lịch</h3>
                    <p className="text-[#E3E3D7]/30">Tháng này chưa có buổi tập nào</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {renderSection(
                        "Hôm nay",
                        <Zap className="h-4 w-4 text-[#A5C838]" />,
                        grouped.today,
                        "Hôm nay không có buổi tập"
                    )}
                    {renderSection(
                        "Sắp tới (3 ngày)",
                        <CalendarIcon className="h-4 w-4 text-[#046839]" />,
                        grouped.upcoming
                    )}
                    {renderSection(
                        "Lịch trong tháng",
                        <CalendarIcon className="h-4 w-4 text-[#A5C838]/50" />,
                        grouped.future
                    )}
                    {grouped.past.length > 0 && renderSection(
                        "Đã qua",
                        <Clock className="h-4 w-4 text-[#E3E3D7]/30" />,
                        grouped.past
                    )}
                </div>
            )}
        </div>
    );
}
