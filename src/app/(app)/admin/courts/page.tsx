"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { Plus, MapPin, Edit, Trash2, Loader2 } from "lucide-react";

interface Court {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    passEnabled: boolean;
    maxCheckin: number;
    defaultCourtFee: string;
    hourlyRate: string;
    active: boolean;
}

export default function AdminCourtsPage() {
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Court | null>(null);
    const [formData, setFormData] = useState({
        name: "", location: "", description: "",
        passEnabled: false, maxCheckin: 8, defaultCourtFee: 0, hourlyRate: 0,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchCourts(); }, []);

    async function fetchCourts() {
        try {
            const res = await fetch("/api/courts");
            const data = await res.json();
            setCourts(data.courts || []);
        } catch { toast("Không thể tải danh sách sân"); }
        finally { setLoading(false); }
    }

    function openCreate() {
        setEditing(null);
        setFormData({ name: "", location: "", description: "", passEnabled: false, maxCheckin: 8, defaultCourtFee: 0, hourlyRate: 0 });
        setDialogOpen(true);
    }

    function openEdit(court: Court) {
        setEditing(court);
        setFormData({
            name: court.name, location: court.location || "", description: court.description || "",
            passEnabled: court.passEnabled, maxCheckin: court.maxCheckin,
            defaultCourtFee: Number(court.defaultCourtFee),
            hourlyRate: Number(court.hourlyRate || 0),
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        if (!formData.name.trim()) { toast("Tên sân không được để trống"); return; }
        setSaving(true);
        try {
            const url = editing ? `/api/courts/${editing.id}` : "/api/courts";
            const method = editing ? "PATCH" : "POST";
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                toast(editing ? "Cập nhật sân thành công" : "Tạo sân thành công");
                setDialogOpen(false);
                fetchCourts();
            } else {
                const data = await res.json();
                toast(data.error || "Lỗi khi lưu");
            }
        } catch { toast("Lỗi kết nối"); }
        finally { setSaving(false); }
    }

    async function handleDelete(id: string) {
        if (!confirm("Bạn có chắc muốn xóa sân này?")) return;
        try {
            const res = await fetch(`/api/courts/${id}`, { method: "DELETE" });
            if (res.ok) { toast("Đã xóa sân"); fetchCourts(); }
        } catch { toast("Lỗi khi xóa"); }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" /> Quản lý sân</h1>
                    <p className="text-muted-foreground">Tạo và quản lý các sân cầu lông</p>
                </div>
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Tạo sân</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : courts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Chưa có sân nào. Tạo sân đầu tiên!</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tên sân</TableHead>
                                    <TableHead>Địa điểm</TableHead>
                                    <TableHead>Phí mặc định</TableHead>
                                    <TableHead>Phí/giờ</TableHead>
                                    <TableHead>Tối đa</TableHead>
                                    <TableHead>Pass</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {courts.map((court) => (
                                    <TableRow key={court.id}>
                                        <TableCell className="font-medium">{court.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{court.location || "—"}</TableCell>
                                        <TableCell className="font-mono">{formatCurrency(court.defaultCourtFee)}</TableCell>
                                        <TableCell className="font-mono">
                                            {Number(court.hourlyRate) > 0 ? formatCurrency(court.hourlyRate) : "—"}
                                        </TableCell>
                                        <TableCell>{court.maxCheckin}</TableCell>
                                        <TableCell>
                                            <Badge variant={court.passEnabled ? "success" : "secondary"}>
                                                {court.passEnabled ? "Bật" : "Tắt"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={court.active ? "success" : "destructive"}>
                                                {court.active ? "Hoạt động" : "Ngừng"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(court)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(court.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog Tạo/Sửa sân */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Cập nhật sân" : "Tạo sân mới"}</DialogTitle>
                        <DialogDescription>Nhập thông tin sân cầu lông</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="court-name">Tên sân *</Label>
                            <Input id="court-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Sân ABC" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="court-location">Địa điểm</Label>
                            <Input id="court-location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="123 Nguyễn Văn A..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="court-desc">Mô tả</Label>
                            <Input id="court-desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="court-fee">Phí sân mặc định (VNĐ)</Label>
                                <Input id="court-fee" type="number" value={formData.defaultCourtFee} onChange={(e) => setFormData({ ...formData, defaultCourtFee: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="court-hourly">Phí theo giờ (VNĐ/giờ)</Label>
                                <Input id="court-hourly" type="number" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })} placeholder="0" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="court-max">Số người tối đa</Label>
                            <Input id="court-max" type="number" value={formData.maxCheckin} onChange={(e) => setFormData({ ...formData, maxCheckin: Number(e.target.value) })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={formData.passEnabled} onCheckedChange={(v) => setFormData({ ...formData, passEnabled: v })} />
                            <Label>Cho phép pass sân</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editing ? "Cập nhật" : "Tạo sân"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
