"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { Calendar, Plus, Trash2, Loader2, Clock } from "lucide-react";

const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

const TIME_OPTIONS = [
    "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
    "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
    "22:00", "22:30", "23:00",
];

interface Court {
    id: string;
    name: string;
    defaultCourtFee: string;
}

interface Rule {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    courtFeePerHour?: number;
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

    // Tính số giờ
    function calcHours(start: string, end: string): number {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
    }

    // Tính phí sân = phí/giờ × số giờ
    function calcCourtFee(rule: Rule): number | undefined {
        if (!rule.courtFeePerHour) return undefined;
        const hours = calcHours(rule.startTime, rule.endTime);
        return rule.courtFeePerHour * hours;
    }

    async function handleGenerate() {
        if (!selectedCourt) { toast("Chọn sân trước"); return; }
        if (rules.length === 0) { toast("Thêm ít nhất 1 lịch"); return; }

        setGenerating(true);
        try {
            // Tính courtFeeOverride = courtFeePerHour * hours
            const processedRules = rules.map(r => ({
                dayOfWeek: r.dayOfWeek,
                startTime: r.startTime,
                endTime: r.endTime,
                courtFeeOverride: calcCourtFee(r),
            }));

            const res = await fetch("/api/schedules/generate-month", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courtId: selectedCourt,
                    month,
                    year,
                    rules: processedRules,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast(`Đã thêm ${data.sessionsCreated} buổi tập mới cho tháng ${month}/${year}`);
            } else {
                toast(data.error || "Lỗi khi tạo lịch");
            }
        } catch {
            toast("Lỗi kết nối");
        } finally {
            setGenerating(false);
        }
    }

    const selectedCourtInfo = courts.find(c => c.id === selectedCourt);

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-[#E3E3D7]">
                    <Calendar className="h-6 w-6 text-[#A5C838]" /> Tạo lịch theo tháng
                </h1>
                <p className="text-[#E3E3D7]/50 mt-1">Đặt lịch cố định theo ngày trong tuần cho từng sân. Các buổi đã có sẽ không bị ghi đè.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg text-[#233630]">Cấu hình lịch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Chọn sân & tháng */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-[#233630]/70 font-medium">Sân cầu lông</Label>
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
                            <Label className="text-[#233630]/70 font-medium">Tháng</Label>
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
                            <Label className="text-[#233630]/70 font-medium">Năm</Label>
                            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2020} max={2100} className="!text-[#233630]" />
                        </div>
                    </div>

                    {selectedCourtInfo && (
                        <div className="bg-[#046839]/10 text-[#233630] px-4 py-2 rounded-lg text-sm">
                            💰 Phí sân mặc định: <strong>{formatCurrency(selectedCourtInfo.defaultCourtFee)}</strong>
                        </div>
                    )}

                    {/* Quy tắc lịch */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold text-[#233630]">Lịch hàng tuần</Label>
                            <button
                                onClick={addRule}
                                className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#046839] text-white text-sm font-medium hover:bg-[#057843] transition-colors"
                            >
                                <Plus className="h-4 w-4" /> Thêm lịch
                            </button>
                        </div>

                        {rules.length === 0 ? (
                            <div className="text-center py-10 text-[#233630]/40 border rounded-xl border-dashed border-[#233630]/15">
                                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                Chưa có lịch nào. Nhấn &quot;Thêm lịch&quot; để bắt đầu.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rules.map((rule, idx) => {
                                    const hours = calcHours(rule.startTime, rule.endTime);
                                    const fee = calcCourtFee(rule);
                                    return (
                                        <div key={idx} className="rounded-xl border border-[#233630]/10 bg-[#233630]/[0.03] p-4 space-y-3">
                                            {/* Row 1: Ngày + Thời gian */}
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-[#233630]/60">Ngày trong tuần</Label>
                                                    <Select value={String(rule.dayOfWeek)} onValueChange={(v) => updateRule(idx, { dayOfWeek: Number(v) })}>
                                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {DAYS.map((d, i) => (
                                                                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-[#233630]/60">Bắt đầu</Label>
                                                    <Select value={rule.startTime} onValueChange={(v) => updateRule(idx, { startTime: v })}>
                                                        <SelectTrigger className="h-10">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="h-3.5 w-3.5 text-[#046839]" />
                                                                <SelectValue />
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {TIME_OPTIONS.map(t => (
                                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-[#233630]/60">Kết thúc</Label>
                                                    <Select value={rule.endTime} onValueChange={(v) => updateRule(idx, { endTime: v })}>
                                                        <SelectTrigger className="h-10">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="h-3.5 w-3.5 text-[#046839]" />
                                                                <SelectValue />
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {TIME_OPTIONS.map(t => (
                                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Row 2: Phí sân/giờ + tính tiền + xóa */}
                                            <div className="flex items-end gap-3">
                                                <div className="flex-1 space-y-1.5">
                                                    <Label className="text-xs text-[#233630]/60">Phí sân / giờ (VNĐ)</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Mặc định từ cài đặt sân"
                                                        value={rule.courtFeePerHour ?? ""}
                                                        onChange={(e) => updateRule(idx, { courtFeePerHour: e.target.value ? Number(e.target.value) : undefined })}
                                                        className="!text-[#233630]"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 pb-0.5">
                                                    {rule.courtFeePerHour && hours > 0 && (
                                                        <span className="text-xs bg-[#A5C838]/15 text-[#233630] px-2 py-1 rounded-lg whitespace-nowrap">
                                                            {hours}h × {rule.courtFeePerHour.toLocaleString()}₫ = <strong>{fee?.toLocaleString()}₫</strong>
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => removeRule(idx)}
                                                        className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Nút tạo lịch */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || rules.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-8 rounded-xl bg-[#A5C838] text-[#233630] font-bold text-sm hover:bg-[#b5d448] transition-colors shadow-lg shadow-[#A5C838]/20 disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                        Tạo lịch tháng {month}/{year}
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}

function formatCurrency(value: string | number): string {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0 ₫";
    return num.toLocaleString("vi-VN") + " ₫";
}
