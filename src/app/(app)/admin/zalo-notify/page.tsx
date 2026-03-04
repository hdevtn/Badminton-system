"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { MessageCircle, Send, Loader2, Copy, Check } from "lucide-react";

export default function ZaloNotifyPage() {
    const [type, setType] = useState("CUSTOM");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [fallbackMsg, setFallbackMsg] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const templates: Record<string, { label: string; template: string }> = {
        REMINDER: {
            label: "Nhắc hẹn buổi tập",
            template: `🏸 NHẮC HẸN\n\n📅 [Ngày]\n⏰ [Giờ]\n📍 Sân: [Tên sân]\n\nAnh/chị nhớ đến đúng giờ nhé! 💪`,
        },
        PAYMENT: {
            label: "Nhắc thanh toán",
            template: `💰 NHẮC THANH TOÁN\n\nPhí cầu lông tháng [Tháng]: [Số tiền]\n\nVui lòng thanh toán sớm nhé. Cảm ơn! 🙏\n\nNgân hàng: TPBank\nSTK: 5395 8686 888`,
        },
        CANCEL: {
            label: "Thông báo hủy",
            template: `⚠️ THÔNG BÁO HỦY\n\n📅 [Ngày]\n📍 Sân: [Tên sân]\nLý do: [Lý do]\n\nXin lỗi vì sự bất tiện! 🙏`,
        },
        CUSTOM: {
            label: "Tùy chỉnh",
            template: "",
        },
    };

    function handleTemplateChange(val: string) {
        setType(val);
        if (val !== "CUSTOM") {
            setMessage(templates[val]?.template || "");
        }
    }

    async function handleSend() {
        if (!message.trim()) {
            toast("Vui lòng nhập nội dung tin nhắn");
            return;
        }

        setLoading(true);
        setFallbackMsg(null);

        try {
            const res = await fetch("/api/admin/zalo-notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, message }),
            });
            const data = await res.json();

            if (data.success) {
                toast("Gửi thành công! 🎉");
                setMessage("");
            } else if (data.fallback) {
                // Chưa cấu hình Zalo OA, hiển thị nội dung để copy
                setFallbackMsg(data.message);
                toast(data.error || "Chưa cấu hình Zalo OA - Vui lòng copy và gửi thủ công");
            } else {
                toast(data.error || "Gửi thất bại");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    }

    async function handleCopy() {
        if (fallbackMsg) {
            await navigator.clipboard.writeText(fallbackMsg);
            setCopied(true);
            toast("Đã sao chép!");
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MessageCircle className="h-6 w-6 text-blue-500" /> Gửi thông báo Zalo
                </h1>
                <p className="text-muted-foreground">Gửi tin nhắn nhắc hẹn hoặc thanh toán đến nhóm Zalo</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Soạn tin nhắn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Loại tin nhắn */}
                    <div className="space-y-2">
                        <Label>Loại thông báo</Label>
                        <Select value={type} onValueChange={handleTemplateChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(templates).map(([key, val]) => (
                                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Nội dung */}
                    <div className="space-y-2">
                        <Label>Nội dung tin nhắn</Label>
                        <textarea
                            className="w-full min-h-[200px] p-3 rounded-lg border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Nhập nội dung tin nhắn..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Thay [Ngày], [Giờ], [Tên sân], [Số tiền] bằng thông tin thực tế
                        </p>
                    </div>

                    {/* Nút gửi */}
                    <Button
                        onClick={handleSend}
                        disabled={loading || !message.trim()}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white h-11"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Send className="h-4 w-4 mr-2" />
                        )}
                        Gửi tin nhắn
                    </Button>
                </CardContent>
            </Card>

            {/* Fallback: Copy thủ công */}
            {fallbackMsg && (
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardHeader>
                        <CardTitle className="text-base text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            ⚠️ Chưa cấu hình Zalo OA - Gửi thủ công
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Sao chép nội dung bên dưới và gửi vào nhóm Zalo thủ công:
                        </p>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-sm whitespace-pre-wrap border">
                            {fallbackMsg}
                        </div>
                        <Button variant="outline" onClick={handleCopy} className="w-full">
                            {copied ? (
                                <><Check className="h-4 w-4 mr-2 text-green-500" /> Đã sao chép</>
                            ) : (
                                <><Copy className="h-4 w-4 mr-2" /> Sao chép nội dung</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Hướng dẫn */}
            <Card className="border-blue-100 dark:border-blue-900">
                <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">💡 Hướng dẫn cấu hình Zalo OA:</p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Đăng ký <strong>Zalo Official Account</strong> tại oa.zalo.me</li>
                        <li>Lấy <strong>Access Token</strong> từ trang quản trị OA</li>
                        <li>Thêm vào file <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.env</code>:
                            <code className="block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-1">
                                ZALO_OA_ACCESS_TOKEN=your_token_here
                            </code>
                        </li>
                        <li>Khởi động lại server</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}
