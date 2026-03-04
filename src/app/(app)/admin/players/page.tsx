"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { Plus, Users, Edit, Trash2, Loader2 } from "lucide-react";

interface Player {
    id: string;
    fullName: string;
    type: "FIXED" | "GUEST";
    guestFeeOverride: string | null;
    active: boolean;
    user: { phone: string; role: string; status: string } | null;
}

export default function AdminPlayersPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Player | null>(null);
    const [formData, setFormData] = useState({
        fullName: "", phone: "", type: "FIXED" as "FIXED" | "GUEST",
        guestFeeOverride: null as number | null,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchPlayers(); }, []);

    async function fetchPlayers() {
        try {
            const res = await fetch("/api/players");
            const data = await res.json();
            setPlayers(data.players || []);
        } catch { toast("Không thể tải danh sách người chơi"); }
        finally { setLoading(false); }
    }

    function openCreate() {
        setEditing(null);
        setFormData({ fullName: "", phone: "", type: "FIXED", guestFeeOverride: null });
        setDialogOpen(true);
    }

    function openEdit(p: Player) {
        setEditing(p);
        setFormData({
            fullName: p.fullName,
            phone: p.user?.phone || "",
            type: p.type,
            guestFeeOverride: p.guestFeeOverride ? Number(p.guestFeeOverride) : null,
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        if (!formData.fullName.trim()) { toast("Tên không được để trống"); return; }
        setSaving(true);
        try {
            const url = editing ? `/api/players/${editing.id}` : "/api/players";
            const method = editing ? "PATCH" : "POST";
            const body: Record<string, unknown> = {
                fullName: formData.fullName,
                type: formData.type,
            };
            if (formData.phone) body.phone = formData.phone;
            if (formData.type === "GUEST" && formData.guestFeeOverride !== null) {
                body.guestFeeOverride = formData.guestFeeOverride;
            }
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                toast(editing ? "Đã cập nhật" : "Đã thêm người chơi");
                setDialogOpen(false);
                fetchPlayers();
            } else {
                const data = await res.json();
                toast(data.error || "Lỗi khi lưu");
            }
        } catch { toast("Lỗi kết nối"); }
        finally { setSaving(false); }
    }

    async function handleDelete(id: string) {
        if (!confirm("Bạn có chắc muốn xóa người chơi này?")) return;
        try {
            await fetch(`/api/players/${id}`, { method: "DELETE" });
            toast("Đã xóa");
            fetchPlayers();
        } catch { toast("Lỗi khi xóa"); }
    }

    const fixed = players.filter(p => p.type === "FIXED" && p.active);
    const guests = players.filter(p => p.type === "GUEST" && p.active);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Người chơi</h1>
                    <p className="text-muted-foreground">{fixed.length} cố định, {guests.length} vãng lai</p>
                </div>
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Thêm người chơi</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tên</TableHead>
                                    <TableHead>SĐT</TableHead>
                                    <TableHead>Loại</TableHead>
                                    <TableHead>Phí vãng lai</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {players.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Chưa có người chơi nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    players.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.fullName}</TableCell>
                                            <TableCell className="text-muted-foreground">{p.user?.phone || "—"}</TableCell>
                                            <TableCell>
                                                <Badge variant={p.type === "FIXED" ? "default" : "warning"}>
                                                    {p.type === "FIXED" ? "Cố định" : "Vãng lai"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                {p.type === "GUEST" && p.guestFeeOverride
                                                    ? formatCurrency(p.guestFeeOverride)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={p.active ? "success" : "secondary"}>
                                                    {p.active ? "Hoạt động" : "Ngừng"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Cập nhật" : "Thêm người chơi"}</DialogTitle>
                        <DialogDescription>Nhập thông tin người chơi</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Họ tên *</Label>
                            <Input value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Nguyễn Văn A" />
                        </div>
                        <div className="space-y-2">
                            <Label>Số điện thoại</Label>
                            <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0912345678" />
                        </div>
                        <div className="space-y-2">
                            <Label>Loại</Label>
                            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "FIXED" | "GUEST" })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FIXED">Cố định</SelectItem>
                                    <SelectItem value="GUEST">Vãng lai</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.type === "GUEST" && (
                            <div className="space-y-2">
                                <Label>Phí vãng lai tùy chỉnh (VNĐ)</Label>
                                <Input type="number" value={formData.guestFeeOverride ?? ""} onChange={(e) => setFormData({ ...formData, guestFeeOverride: e.target.value ? Number(e.target.value) : null })} placeholder="Để trống để dùng giá mặc định" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editing ? "Cập nhật" : "Thêm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
