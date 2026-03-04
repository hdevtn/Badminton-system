"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { Settings, Save, Loader2 } from "lucide-react";

interface SettingsData {
    guest_fee_default: number;
    remind_threshold: number;
    delta_handling: string;
    auth_require_otp: boolean;
    default_shuttle_fee: number;
    remind_offset_hours: number;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch("/api/settings")
            .then((r) => r.json())
            .then((d) => setSettings(d.settings))
            .catch(() => toast("Không thể tải cài đặt"))
            .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
        if (!settings) return;
        setSaving(true);
        try {
            const res = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (res.ok) { toast("Đã lưu cài đặt"); }
            else { toast("Lỗi khi lưu"); }
        } catch { toast("Lỗi kết nối"); }
        finally { setSaving(false); }
    }

    if (loading || !settings) {
        return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Cài đặt</h1>
                    <p className="text-muted-foreground">Cấu hình hệ thống</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu cài đặt
                </Button>
            </div>

            {/* Xác thực */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Xác thực</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base">Yêu cầu OTP khi đăng nhập</Label>
                            <p className="text-sm text-muted-foreground">Bật để yêu cầu xác thực OTP cho admin và người dùng mới</p>
                        </div>
                        <Switch checked={settings.auth_require_otp} onCheckedChange={(v) => setSettings({ ...settings, auth_require_otp: v })} />
                    </div>
                </CardContent>
            </Card>

            {/* Tính tiền */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Tính tiền</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Phí vãng lai mặc định (VNĐ)</Label>
                            <Input type="number" value={settings.guest_fee_default} onChange={(e) => setSettings({ ...settings, guest_fee_default: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phí cầu mặc định (VNĐ)</Label>
                            <Input type="number" value={settings.default_shuttle_fee} onChange={(e) => setSettings({ ...settings, default_shuttle_fee: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Xử lý chênh lệch (delta)</Label>
                        <Select value={settings.delta_handling} onValueChange={(v) => setSettings({ ...settings, delta_handling: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="carry_to_next">Dồn vào quỹ tháng (carry_to_next)</SelectItem>
                                <SelectItem value="split_among_attendees">Chia cho người tham gia</SelectItem>
                                <SelectItem value="split_among_roster">Chia cho toàn bộ roster cố định</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Nhắc nhở */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Nhắc nhở</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Ngưỡng nhắc nhở (số người)</Label>
                            <Input type="number" value={settings.remind_threshold} onChange={(e) => setSettings({ ...settings, remind_threshold: Number(e.target.value) })} />
                            <p className="text-xs text-muted-foreground">Gửi nhắc khi số người tham gia dưới ngưỡng này</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Nhắc trước (giờ)</Label>
                            <Input type="number" value={settings.remind_offset_hours} onChange={(e) => setSettings({ ...settings, remind_offset_hours: Number(e.target.value) })} />
                            <p className="text-xs text-muted-foreground">Số giờ trước buổi tập để gửi nhắc</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
