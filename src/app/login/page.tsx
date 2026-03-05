"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { Loader2, Phone, Shield, ArrowRight, MessageCircle, Smartphone } from "lucide-react";

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#233630]">
                <Loader2 className="h-8 w-8 animate-spin text-[#A5C838]" />
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

    useEffect(() => {
        const ua = navigator.userAgent || "";
        setIsMobile(/iPhone|iPad|iPod|Android|Mobile/i.test(ua));
    }, []);

    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast(decodeURIComponent(error));
            window.history.replaceState({}, "", "/login");
        }
    }, [searchParams]);

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
                    if (otpResult.devCode) setDevCode(otpResult.devCode);
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

    const handleZaloLogin = () => {
        window.location.href = "/api/auth/zalo";
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#233630] p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#046839]/20 rounded-full blur-[100px]" />
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#A5C838]/10 rounded-full blur-[100px]" />
                <div className="absolute top-20 left-20 w-2 h-2 bg-[#A5C838]/30 rounded-full" />
                <div className="absolute bottom-40 right-20 w-3 h-3 bg-[#046839]/40 rounded-full" />
                <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-[#A5C838]/20 rounded-full" />
            </div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#046839] shadow-2xl shadow-[#046839]/40 mb-5">
                        <span className="text-4xl">🏸</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#A5C838] mb-1">
                        Cầu Lông Club
                    </h1>
                    <p className="text-[#E3E3D7]/50 text-sm">
                        Quản lý lịch sân · Điểm danh · Tính tiền
                    </p>
                </div>

                {/* Card login */}
                <div className="card-sport p-6 animate-slide-up">
                    <div className="text-center mb-5">
                        <h2 className="text-xl font-bold text-[#233630]">
                            {step === "phone" ? "Đăng nhập" : "Xác thực OTP"}
                        </h2>
                        <p className="text-sm text-[#233630]/50 mt-1">
                            {step === "phone"
                                ? "Nhập SĐT hoặc đăng nhập bằng Zalo"
                                : `Nhập mã OTP đã gửi đến ${phone}`}
                        </p>
                    </div>

                    {step === "phone" ? (
                        <div className="space-y-4">
                            {/* Zalo button */}
                            <button
                                type="button"
                                onClick={handleZaloLogin}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-[#0068FF] hover:bg-[#0055D4] text-white font-semibold h-12 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 text-base disabled:opacity-50"
                            >
                                <MessageCircle className="h-5 w-5" />
                                Đăng nhập với Zalo
                            </button>

                            {isMobile && (
                                <p className="text-xs text-center text-[#046839] flex items-center justify-center gap-1">
                                    <Smartphone className="h-3 w-3" />
                                    Mở app Zalo để đăng nhập nhanh
                                </p>
                            )}

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full h-px bg-[#233630]/15" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#E3E3D7] px-3 text-[#233630]/40 font-medium tracking-wide">
                                        Hoặc bằng SĐT
                                    </span>
                                </div>
                            </div>

                            {/* Phone form */}
                            <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[#233630]/70">Số điện thoại</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 h-4 w-4 text-[#233630]/30" />
                                        <input
                                            type="tel"
                                            placeholder="0912345678"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            disabled={loading}
                                            className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#233630]/15 bg-white/60 text-[#233630] placeholder-[#233630]/30 focus:outline-none focus:ring-2 focus:ring-[#046839]/30 focus:border-[#046839]/30 transition-all"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !phone.trim()}
                                    className="w-full h-12 rounded-xl gradient-primary text-[#E3E3D7] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-[#046839]/20"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                    Đăng nhập
                                </button>
                            </form>
                        </div>
                    ) : (
                        <form onSubmit={handleOtpSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#233630]/70">Mã OTP</label>
                                <input
                                    type="text"
                                    placeholder="000000"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    maxLength={6}
                                    disabled={loading}
                                    autoFocus
                                    className="w-full h-14 px-4 rounded-xl border border-[#233630]/15 bg-white/60 text-[#233630] text-center text-2xl tracking-[0.4em] font-mono placeholder-[#233630]/20 focus:outline-none focus:ring-2 focus:ring-[#046839]/30 transition-all"
                                />
                                {devCode && (
                                    <p className="text-xs text-amber-600 text-center">[DEV] Mã OTP: {devCode}</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading || otpCode.length !== 6}
                                className="w-full h-12 rounded-xl gradient-primary text-[#E3E3D7] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                                Xác thực
                            </button>
                            <button
                                type="button"
                                onClick={() => { setStep("phone"); setOtpCode(""); setDevCode(null); }}
                                className="w-full h-10 text-sm text-[#233630]/50 hover:text-[#233630] transition-colors"
                            >
                                ← Quay lại
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-xs text-[#E3E3D7]/30 mt-6">
                    Nhập SĐT đã đăng ký hoặc dùng Zalo để truy cập hệ thống
                </p>
            </div>
        </div>
    );
}
