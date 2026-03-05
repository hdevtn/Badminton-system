"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { Trophy, Medal, Star, Loader2, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
    playerId: string;
    fullName: string;
    type: string;
    totalSessions: number;
    rank: number;
}

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [myStats, setMyStats] = useState<LeaderboardEntry | null>(null);

    const isAdmin = user?.role === "ADMIN";

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    async function fetchLeaderboard() {
        try {
            const res = await fetch("/api/leaderboard");
            const data = await res.json();
            setEntries(data.entries || []);
            setMyStats(data.myStats || null);
        } catch {
            toast("Không thể tải bảng xếp hạng");
        } finally {
            setLoading(false);
        }
    }

    function getRankIcon(rank: number) {
        if (rank === 1) return <Trophy className="h-6 w-6 text-amber-400" />;
        if (rank === 2) return <Medal className="h-6 w-6 text-gray-300" />;
        if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
        return <span className="w-6 h-6 inline-flex items-center justify-center text-sm font-bold text-[#233630]/40">{rank}</span>;
    }

    function getRankBg(rank: number) {
        if (rank === 1) return "bg-gradient-to-r from-amber-300/40 via-yellow-200/30 to-amber-300/10 border-amber-300/50 shadow-md shadow-amber-400/20";
        if (rank === 2) return "bg-gradient-to-r from-gray-200/20 to-gray-200/5 border-gray-300/25";
        if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-500/25";
        return "border-[#233630]/5";
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#A5C838]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 lg:pb-6 max-w-2xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#E3E3D7] flex items-center gap-2">
                    <Trophy className="h-7 w-7 text-[#A5C838]" />
                    Bảng xếp hạng
                </h1>
                <p className="text-[#E3E3D7]/50 mt-1">
                    {isAdmin ? "Thống kê tổng số buổi tham gia của tất cả thành viên" : "Số buổi bạn đã tham gia"}
                </p>
            </div>

            {/* My stats card (for member) */}
            {!isAdmin && myStats && (
                <div className="rounded-2xl bg-gradient-to-br from-[#046839] to-[#233630] p-5 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/60">Thứ hạng của bạn</p>
                            <p className="text-4xl font-bold mt-1">#{myStats.rank}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-white/60">Số buổi tham gia</p>
                            <p className="text-4xl font-bold mt-1 text-[#A5C838]">{myStats.totalSessions}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                        <Star className="h-4 w-4 text-[#A5C838]" />
                        <span className="text-sm text-white/80">{myStats.fullName}</span>
                    </div>
                </div>
            )}

            {/* Leaderboard list */}
            {isAdmin ? (
                <div className="space-y-2">
                    {entries.length === 0 ? (
                        <Card>
                            <CardContent className="p-12 text-center text-[#233630]/40">
                                Chưa có dữ liệu tham gia
                            </CardContent>
                        </Card>
                    ) : (
                        entries.map((entry) => (
                            <div
                                key={entry.playerId}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl border bg-[#F9FFE4] transition-all ${getRankBg(entry.rank)}`}
                            >
                                <div className="flex-shrink-0">
                                    {getRankIcon(entry.rank)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[#233630] truncate">{entry.fullName}</p>
                                    <p className="text-xs text-[#233630]/40">
                                        {entry.type === "FIXED" ? "Cố định" : "Vãng lai"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp className="h-4 w-4 text-[#046839]" />
                                    <span className="text-xl font-bold text-[#046839]">{entry.totalSessions}</span>
                                    <span className="text-xs text-[#233630]/40">buổi</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Non-admin sees just their own stats above + top 5 for context */
                <div className="space-y-2">
                    <p className="text-sm text-[#E3E3D7]/40 font-medium">Top thành viên</p>
                    {entries.slice(0, 5).map((entry) => (
                        <div
                            key={entry.playerId}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl border bg-[#F9FFE4] transition-all ${getRankBg(entry.rank)} ${entry.playerId === myStats?.playerId ? "ring-2 ring-[#A5C838]/40" : ""}`}
                        >
                            <div className="flex-shrink-0">
                                {getRankIcon(entry.rank)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#233630] truncate">
                                    {entry.fullName}
                                    {entry.playerId === myStats?.playerId && <span className="text-[#046839] text-xs ml-1">(Bạn)</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xl font-bold text-[#046839]">{entry.totalSessions}</span>
                                <span className="text-xs text-[#233630]/40">buổi</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
