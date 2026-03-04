"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { Receipt, ChevronLeft, ChevronRight, Loader2, Calculator, FileText, DollarSign } from "lucide-react";

export default function AdminBillingPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [recalculating, setRecalculating] = useState<string | null>(null);
    const [generatingInvoices, setGeneratingInvoices] = useState(false);
    const [payDialog, setPayDialog] = useState<any>(null);
    const [payAmount, setPayAmount] = useState(0);
    const [payRef, setPayRef] = useState("");
    const [paying, setPaying] = useState(false);

    useEffect(() => { fetchData(); }, [currentMonth]);

    async function fetchData() {
        setLoading(true);
        try {
            const [sRes, iRes] = await Promise.all([
                fetch(`/api/sessions?month=${currentMonth}`),
                fetch(`/api/invoices?period=${currentMonth}`),
            ]);
            const sd = await sRes.json();
            const id = await iRes.json();
            setSessions(sd.sessions || []);
            setInvoices(id.invoices || []);
        } catch { toast("Lỗi tải dữ liệu"); }
        finally { setLoading(false); }
    }

    const navigateMonth = (dir: number) => {
        const [y, m] = currentMonth.split("-").map(Number);
        const d = new Date(y, m - 1 + dir, 1);
        setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    };

    async function recalcSession(sessionId: string) {
        setRecalculating(sessionId);
        try {
            const res = await fetch(`/api/billing/recalculate-session/${sessionId}`, { method: "POST" });
            if (res.ok) { toast("Đã tính lại chi phí"); }
            else { const d = await res.json(); toast(d.error || "Lỗi"); }
        } catch { toast("Lỗi kết nối"); }
        finally { setRecalculating(null); }
    }

    async function generateInvoices() {
        setGeneratingInvoices(true);
        try {
            const res = await fetch(`/api/billing/generate-invoices?period=${currentMonth}`, { method: "POST" });
            const data = await res.json();
            if (res.ok) { toast(`Đã tạo ${data.count} hóa đơn`); fetchData(); }
            else { toast(data.error || "Lỗi tạo hóa đơn"); }
        } catch { toast("Lỗi kết nối"); }
        finally { setGeneratingInvoices(false); }
    }

    async function handlePay() {
        if (!payDialog) return;
        setPaying(true);
        try {
            const res = await fetch("/api/payments/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId: payDialog.id, amount: payAmount, refCode: payRef || undefined }),
            });
            if (res.ok) { toast("Đã ghi nhận thanh toán"); setPayDialog(null); fetchData(); }
            else { const d = await res.json(); toast(d.error || "Lỗi"); }
        } catch { toast("Lỗi kết nối"); }
        finally { setPaying(false); }
    }

    const [year, month] = currentMonth.split("-").map(Number);
    const monthName = new Date(year, month - 1).toLocaleString("vi-VN", { month: "long", year: "numeric" });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Tính tiền</h1>
                    <p className="text-muted-foreground">Chốt tiền, tạo hóa đơn, ghi nhận thanh toán</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="font-medium min-w-[160px] text-center capitalize">{monthName}</span>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Hành động */}
            <div className="flex gap-3 flex-wrap">
                <Button onClick={generateInvoices} disabled={generatingInvoices}>
                    {generatingInvoices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Tạo hóa đơn tháng {month}/{year}
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <>
                    {/* Chốt tiền theo buổi */}
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Chốt tiền theo buổi</CardTitle></CardHeader>
                        <CardContent>
                            {sessions.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">Không có buổi tập</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sân</TableHead>
                                            <TableHead>Ngày</TableHead>
                                            <TableHead>Phí sân</TableHead>
                                            <TableHead>Phí cầu</TableHead>
                                            <TableHead>Pass</TableHead>
                                            <TableHead>Người</TableHead>
                                            <TableHead className="text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessions.map((s: any) => (
                                            <TableRow key={s.id}>
                                                <TableCell className="font-medium">{s.court.name}</TableCell>
                                                <TableCell>{new Date(s.startAt).toLocaleDateString("vi-VN")}</TableCell>
                                                <TableCell className="font-mono">{formatCurrency(s.courtFee)}</TableCell>
                                                <TableCell className="font-mono">{formatCurrency(s.shuttleFee)}</TableCell>
                                                <TableCell><Badge variant={s.passStatus === "SUCCESS" ? "success" : "outline"}>{s.passStatus === "SUCCESS" ? "Thành công" : s.passStatus}</Badge></TableCell>
                                                <TableCell>{s._count?.attendances || 0}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="outline" onClick={() => recalcSession(s.id)} disabled={recalculating === s.id}>
                                                        {recalculating === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-1 h-4 w-4" />}
                                                        Tính
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hóa đơn */}
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Hóa đơn</CardTitle></CardHeader>
                        <CardContent>
                            {invoices.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">Chưa có hóa đơn</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Người chơi</TableHead>
                                            <TableHead>Tổng tiền</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            <TableHead className="text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((inv: any) => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-medium">{inv.player?.fullName}</TableCell>
                                                <TableCell className="font-mono">{formatCurrency(inv.totalDecimal)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={inv.status === "PAID" ? "success" : inv.status === "PARTIAL" ? "warning" : "destructive"}>
                                                        {inv.status === "PAID" ? "Đã đóng" : inv.status === "PARTIAL" ? "Một phần" : "Chưa đóng"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {inv.status !== "PAID" && (
                                                        <Button size="sm" variant="outline" onClick={() => { setPayDialog(inv); setPayAmount(Number(inv.totalDecimal)); setPayRef(""); }}>
                                                            <DollarSign className="mr-1 h-4 w-4" /> Ghi nhận
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Dialog Thanh toán */}
            <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Ghi nhận thanh toán</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Số tiền (VNĐ)</Label>
                            <Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Mã giao dịch (tùy chọn)</Label>
                            <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Mã tham chiếu" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayDialog(null)}>Hủy</Button>
                        <Button onClick={handlePay} disabled={paying}>
                            {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
