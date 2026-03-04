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
import { Loader2, Phone, Shield, ArrowRight, MessageCircle } from "lucide-react";

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

    // Hiển thị lỗi từ Zalo callback (nếu có)
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

    // Chuyển hướng sang Zalo OAuth
    const handleZaloLogin = () => {
        window.location.href = "/api/auth/zalo";
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 p-4">
            {/* Trang trí nền */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                {/* Logo / Thương hiệu */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg shadow-blue-500/25 mb-4">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Câu Lạc Bộ Cầu Lông
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Quản lý lịch sân và tính tiền cầu lông
                    </p>
                </div>

                <Card className="glass border-0 shadow-xl">
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
                                    className="w-full bg-[#0068FF] hover:bg-[#0055D4] text-white font-semibold h-11 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25"
                                >
                                    <MessageCircle className="mr-2 h-5 w-5" />
                                    Đăng nhập với Zalo
                                </Button>

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

                                {/* ===== FORM ĐĂNG NHẬP SĐT ===== */}
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
                                                className="pl-10"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full gradient-primary hover:opacity-90 text-white"
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
                                        className="text-center text-2xl tracking-widest"
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
                                    className="w-full gradient-primary hover:opacity-90 text-white"
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
