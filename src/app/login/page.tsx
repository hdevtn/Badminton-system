"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toaster";
import { Loader2, Phone, Shield, ArrowRight, MessageCircle, Smartphone } from "lucide-react";

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const { login, requestOtp, verifyOtp, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [phone, setPhone] = useState("");
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [otpCode, setOtpCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [devCode, setDevCode] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile device
    useEffect(() => {
        const ua = navigator.userAgent || "";
        const mobile = /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
        setIsMobile(mobile);
    }, []);

    // Hiển thị lỗi từ Zalo callback
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast(decodeURIComponent(error));
            window.history.replaceState({}, "", "/login");
        }
    }, [searchParams]);

    // Chuyển hướng nếu đã đăng nhập
    if (user) {
        router.replace(user.role === "ADMIN" ? "/admin/dashboard" : "/calendar");
        return null;
    }

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim()) return;

        setLoading(true);
        try {
            const result = await login(phone);

            if (result.success) {
                toast("Đăng nhập thành công!");
                router.replace("/");
                return;
            }

            if (result.requiresOtp) {
                const otpResult = await requestOtp(phone);
                if (otpResult.success) {
                    setStep("otp");
                    if (otpResult.devCode) {
                        setDevCode(otpResult.devCode);
                    }
                    toast("Mã OTP đã được gửi");
                } else {
                    toast(otpResult.error || "Không thể gửi OTP");
                }
            } else {
                toast(result.error || "Đăng nhập thất bại");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otpCode.trim()) return;

        setLoading(true);
        try {
            const result = await verifyOtp(phone, otpCode);
            if (result.success) {
                toast("Xác thực thành công!");
                router.replace("/");
            } else {
                toast(result.error || "Mã OTP không đúng");
            }
        } finally {
            setLoading(false);
        }
    };

    // Zalo: redirect OAuth (hoạt động cả mobile và desktop)
    const handleZaloLogin = () => {
        window.location.href = "/api/auth/zalo";
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-950 dark:via-emerald-950/30 dark:to-slate-900 p-4">
            {/* Trang trí nền */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-400/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-brand shadow-lg shadow-emerald-500/25 mb-4">
                        <span className="text-3xl">🏸</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gradient">
                        Câu Lạc Bộ Cầu Lông
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Quản lý lịch sân và tính tiền cầu lông
                    </p>
                </div>

                <Card className="glass border-0 shadow-xl shadow-emerald-500/5">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">
                            {step === "phone" ? "Đăng nhập" : "Xác thực OTP"}
                        </CardTitle>
                        <CardDescription>
                            {step === "phone"
                                ? "Nhập số điện thoại hoặc đăng nhập bằng Zalo"
                                : `Nhập mã OTP đã gửi đến ${phone}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === "phone" ? (
                            <div className="space-y-4">
                                {/* ===== NÚT ĐĂNG NHẬP ZALO ===== */}
                                <Button
                                    type="button"
                                    onClick={handleZaloLogin}
                                    disabled={loading}
                                    className="w-full bg-[#0068FF] hover:bg-[#0055D4] text-white font-semibold h-12 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 text-base"
                                >
                                    <MessageCircle className="mr-2 h-5 w-5" />
                                    Đăng nhập với Zalo
                                </Button>

                                {/* Gợi ý mobile */}
                                {isMobile && (
                                    <p className="text-xs text-center text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                                        <Smartphone className="h-3 w-3" />
                                        Mở ứng dụng Zalo để đăng nhập nhanh
                                    </p>
                                )}

                                {/* Phân cách */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <Separator />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">
                                            Hoặc đăng nhập bằng SĐT
                                        </span>
                                    </div>
                                </div>

                                {/* ===== FORM SĐT ===== */}
                                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Số điện thoại</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="0912345678"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="pl-10 h-11"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full gradient-primary hover:opacity-90 text-white h-11"
                                        disabled={loading || !phone.trim()}
                                    >
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <ArrowRight className="mr-2 h-4 w-4" />
                                        )}
                                        Đăng nhập
                                    </Button>
                                </form>
                            </div>
                        ) : (
                            <form onSubmit={handleOtpSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="otp">Mã OTP</Label>
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="000000"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        maxLength={6}
                                        className="text-center text-2xl tracking-widest h-14"
                                        disabled={loading}
                                        autoFocus
                                    />
                                    {devCode && (
                                        <p className="text-xs text-amber-600 text-center">
                                            [DEV] Mã OTP: {devCode}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full gradient-primary hover:opacity-90 text-white h-11"
                                    disabled={loading || otpCode.length !== 6}
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Shield className="mr-2 h-4 w-4" />
                                    )}
                                    Xác thực
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => {
                                        setStep("phone");
                                        setOtpCode("");
                                        setDevCode(null);
                                    }}
                                >
                                    Quay lại
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Nhập số điện thoại đã đăng ký hoặc dùng Zalo để truy cập hệ thống
                </p>
            </div>
        </div>
    );
}
