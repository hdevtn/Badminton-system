"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { Calendar, Plus, Trash2, Loader2 } from "lucide-react";

const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

interface Court {
    id: string;
    name: string;
    defaultCourtFee: string;
}

interface Rule {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    courtFeeOverride?: number;
}

export default function AdminSchedulesPage() {
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedCourt, setSelectedCourt] = useState("");
    const [month, setMonth] = useState(() => {
        const now = new Date();
        return now.getMonth() + 1;
    });
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [rules, setRules] = useState<Rule[]>([]);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/courts")
            .then((r) => r.json())
            .then((d) => {
                setCourts(d.courts || []);
                if (d.courts?.length > 0) setSelectedCourt(d.courts[0].id);
            })
            .finally(() => setLoading(false));
    }, []);

    function addRule() {
        setRules([...rules, { dayOfWeek: 1, startTime: "19:00", endTime: "21:00" }]);
    }

    function updateRule(index: number, updates: Partial<Rule>) {
        setRules(rules.map((r, i) => (i === index ? { ...r, ...updates } : r)));
    }

    function removeRule(index: number) {
        setRules(rules.filter((_, i) => i !== index));
    }

    async function handleGenerate() {
        if (!selectedCourt) { toast("Chọn sân trước"); return; }
        if (rules.length === 0) { toast("Thêm ít nhất 1 lịch"); return; }

        setGenerating(true);
        try {
            const res = await fetch("/api/schedules/generate-month", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courtId: selectedCourt,
                    month,
                    year,
                    rules,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast(`Đã tạo ${data.sessionsCreated} buổi tập cho tháng ${month}/${year}`);
            } else {
                toast(data.error || "Lỗi khi tạo lịch");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="h-6 w-6" /> Tạo lịch theo tháng
                </h1>
                <p className="text-muted-foreground">Đặt lịch cố định theo ngày trong tuần cho từng sân</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Cấu hình lịch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Chọn sân & tháng */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Sân cầu lông</Label>
                            <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                                <SelectTrigger><SelectValue placeholder="Chọn sân" /></SelectTrigger>
                                <SelectContent>
                                    {courts.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tháng</Label>
                            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <SelectItem key={i + 1} value={String(i + 1)}>Tháng {i + 1}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Năm</Label>
                            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2020} max={2100} />
                        </div>
                    </div>

                    {/* Quy tắc lịch */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Lịch hàng tuần</Label>
                            <Button variant="outline" size="sm" onClick={addRule}>
                                <Plus className="mr-2 h-4 w-4" /> Thêm lịch
                            </Button>
                        </div>

                        {rules.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                Chưa có lịch nào. Nhấn &quot;Thêm lịch&quot; để bắt đầu.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rules.map((rule, idx) => (
                                    <div key={idx} className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-muted/30">
                                        <div className="space-y-1 flex-1 min-w-[120px]">
                                            <Label className="text-xs">Ngày</Label>
                                            <Select value={String(rule.dayOfWeek)} onValueChange={(v) => updateRule(idx, { dayOfWeek: Number(v) })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {DAYS.map((d, i) => (
                                                        <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1 w-[100px]">
                                            <Label className="text-xs">Bắt đầu</Label>
                                            <Input type="time" value={rule.startTime} onChange={(e) => updateRule(idx, { startTime: e.target.value })} />
                                        </div>
                                        <div className="space-y-1 w-[100px]">
                                            <Label className="text-xs">Kết thúc</Label>
                                            <Input type="time" value={rule.endTime} onChange={(e) => updateRule(idx, { endTime: e.target.value })} />
                                        </div>
                                        <div className="space-y-1 w-[140px]">
                                            <Label className="text-xs">Phí sân tùy chỉnh</Label>
                                            <Input type="number" placeholder="Mặc định" value={rule.courtFeeOverride ?? ""} onChange={(e) => updateRule(idx, { courtFeeOverride: e.target.value ? Number(e.target.value) : undefined })} />
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRule(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nút tạo lịch */}
                    <Button onClick={handleGenerate} disabled={generating || rules.length === 0} className="w-full sm:w-auto" size="lg">
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                        Tạo lịch tháng {month}/{year}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
