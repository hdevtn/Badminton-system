"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Receipt, QrCode, Loader2 } from "lucide-react";

interface InvoiceDetail {
    id: string;
    periodYyyyMm: string;
    totalDecimal: string;
    status: string;
    vietqrPayloadJson: {
        bankAccountNo: string;
        bankAccountName: string;
        amount: number;
        addInfo: string;
        qrDataUrl?: string;
    } | null;
    player: { fullName: string; user?: { phone: string } };
    invoiceItems: {
        id: string;
        amountDecimal: string;
        session: {
            startAt: string;
            courtFee: string;
            shuttleFee: string;
            passStatus: string;
            court: { name: string };
        };
    }[];
    payments: {
        id: string;
        amountDecimal: string;
        method: string;
        paidAt: string;
        refCode: string | null;
    }[];
}

export default function InvoiceDetailPage() {
    const params = useParams();
    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoice();
    }, [params.id]);

    async function fetchInvoice() {
        try {
            const res = await fetch(`/api/invoices/${params.id}`);
            const data = await res.json();
            setInvoice(data.invoice);
        } catch {
            toast("Khong the tai hoa don");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!invoice) {
        return <Card><CardContent className="p-12 text-center">Khong tim thay hoa don</CardContent></Card>;
    }

    const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amountDecimal), 0);
    const remaining = Number(invoice.totalDecimal) - totalPaid;
    const qr = invoice.vietqrPayloadJson;

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Hoa don {invoice.periodYyyyMm}</h1>
                    <p className="text-muted-foreground">{invoice.player.fullName}</p>
                </div>
                <Badge
                    variant={invoice.status === "PAID" ? "success" : invoice.status === "PARTIAL" ? "warning" : "destructive"}
                    className="text-base px-4 py-1"
                >
                    {invoice.status === "PAID" ? "Da dong" : invoice.status === "PARTIAL" ? "Dong 1 phan" : "Chua dong"}
                </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* QR Code */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            Thanh toan VietQR
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        {qr?.qrDataUrl ? (
                            <img src={qr.qrDataUrl} alt="VietQR" className="w-64 h-64 rounded-lg border" />
                        ) : (
                            <div className="w-64 h-64 rounded-lg border bg-muted flex items-center justify-center">
                                <p className="text-muted-foreground text-sm text-center px-4">QR Code chua duoc tao</p>
                            </div>
                        )}
                        <div className="text-center space-y-1">
                            <p className="text-2xl font-bold text-primary">{formatCurrency(remaining > 0 ? remaining : Number(invoice.totalDecimal))}</p>
                            {qr && (
                                <>
                                    <p className="text-sm text-muted-foreground">STK: {qr.bankAccountNo}</p>
                                    <p className="text-sm text-muted-foreground">Ten: {qr.bankAccountName}</p>
                                    <p className="text-sm font-mono bg-muted p-2 rounded mt-2">{qr.addInfo}</p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Summary */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Tong hop</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tong tien</span>
                                <span className="font-mono font-semibold">{formatCurrency(invoice.totalDecimal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Da dong</span>
                                <span className="font-mono text-green-600">{formatCurrency(totalPaid)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="font-medium">Con lai</span>
                                <span className="font-mono font-bold text-lg">{formatCurrency(remaining)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payments history */}
                    {invoice.payments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Lich su thanh toan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {invoice.payments.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                            <div>
                                                <p className="text-sm font-medium">{formatCurrency(p.amountDecimal)}</p>
                                                <p className="text-xs text-muted-foreground">{formatDateTime(p.paidAt)}</p>
                                            </div>
                                            <Badge variant="outline">{p.method}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Breakdown by session */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Chi tiet theo buoi</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>San</TableHead>
                                <TableHead>Thoi gian</TableHead>
                                <TableHead>Pass</TableHead>
                                <TableHead className="text-right">So tien</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.invoiceItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.session.court.name}</TableCell>
                                    <TableCell>{formatDateTime(item.session.startAt)}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.session.passStatus === "SUCCESS" ? "success" : "outline"}>
                                            {item.session.passStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(item.amountDecimal)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
