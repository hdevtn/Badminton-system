"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check, X, Loader2, RefreshCw, AlertTriangle, Clock } from "lucide-react";

interface Notification {
    id: string;
    type: string;
    fromUserId: string | null;
    playerId: string | null;
    title: string;
    message: string;
    metaJson: any;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
}

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function fetchNotifications() {
        try {
            const res = await fetch("/api/notifications");
            const data = await res.json();
            setNotifications(data.notifications || []);
        } catch {
            toast("Lỗi tải thông báo");
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(id: string, action: "approve" | "reject") {
        setActionLoading(id);
        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action }),
            });
            if (res.ok) {
                toast(action === "approve" ? "Đã duyệt ✅" : "Đã từ chối ❌");
                fetchNotifications();
            } else {
                toast("Lỗi xử lý");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setActionLoading(null);
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case "PENDING":
                return <span className="text-[10px] px-2 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold">Chờ duyệt</span>;
            case "APPROVED":
                return <span className="text-[10px] px-2 py-1 rounded-full bg-[#046839]/20 text-[#A5C838] font-bold">Đã duyệt</span>;
            case "REJECTED":
                return <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-bold">Từ chối</span>;
            default:
                return <span className="text-[10px] px-2 py-1 rounded-full bg-[#E3E3D7]/10 text-[#E3E3D7]/50 font-bold">Đã đọc</span>;
        }
    }

    function getTypeIcon(type: string) {
        switch (type) {
            case "TYPE_CHANGE_REQUEST":
                return <RefreshCw className="h-5 w-5 text-[#A5C838]" />;
            case "CANCEL_CHECKIN":
                return <AlertTriangle className="h-5 w-5 text-amber-400" />;
            default:
                return <Bell className="h-5 w-5 text-[#E3E3D7]/50" />;
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#A5C838]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 lg:pb-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-[#E3E3D7] flex items-center gap-2">
                    <Bell className="h-7 w-7 text-[#A5C838]" />
                    Thông báo
                </h1>
                <p className="text-[#E3E3D7]/50 mt-1">
                    Duyệt yêu cầu từ thành viên
                </p>
            </div>

            {notifications.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-[#233630]/40">
                        <Bell className="h-12 w-12 mx-auto text-[#A5C838]/20 mb-4" />
                        <p>Không có thông báo nào</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`rounded-xl border p-4 transition-all ${n.status === "PENDING"
                                    ? "bg-[#2a3f38] border-[#A5C838]/20 shadow-lg"
                                    : "bg-[#1a2b26] border-[#E3E3D7]/5 opacity-60"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5">{getTypeIcon(n.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-[#E3E3D7]">{n.title}</span>
                                        {getStatusBadge(n.status)}
                                    </div>
                                    <p className="text-xs text-[#E3E3D7]/50 mb-2">{n.message}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#E3E3D7]/30">
                                        <Clock className="h-3 w-3" />
                                        {new Date(n.createdAt).toLocaleString("vi-VN")}
                                    </div>

                                    {/* Meta info */}
                                    {n.type === "TYPE_CHANGE_REQUEST" && n.metaJson && (
                                        <div className="mt-2 bg-[#046839]/10 rounded-lg px-3 py-2 text-xs text-[#E3E3D7]/60">
                                            Chuyển từ <strong>{n.metaJson.currentType === "FIXED" ? "Cố định" : "Vãng lai"}</strong> →{" "}
                                            <strong className="text-[#A5C838]">{n.metaJson.newType === "FIXED" ? "Cố định" : "Vãng lai"}</strong>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {n.status === "PENDING" && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleAction(n.id, "approve")}
                                            disabled={actionLoading === n.id}
                                            className="w-9 h-9 rounded-lg bg-[#046839] text-white hover:bg-[#057843] flex items-center justify-center transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === n.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleAction(n.id, "reject")}
                                            disabled={actionLoading === n.id}
                                            className="w-9 h-9 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 flex items-center justify-center transition-colors disabled:opacity-50"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
