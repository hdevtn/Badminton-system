"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Phone, Loader2, CheckCircle, AlertCircle, Smartphone } from "lucide-react";
import Image from "next/image";

export default function CompleteProfilePage() {
    const router = useRouter();
    const { user, refresh } = useAuth();
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        // Nếu user đã có SĐT thật → redirect
        if (user && !user.phone.startsWith("zalo_")) {
            const dest = user.role === "ADMIN" ? "/admin/dashboard" : "/calendar";
            router.replace(dest);
        }
    }, [user, router]);

    function formatPhoneDisplay(value: string): string {
        const digits = value.replace(/\D/g, "");
        if (digits.length <= 4) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    }

    function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
        setPhone(raw);
        setError("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");

        const cleanPhone = phone.replace(/\s+/g, "");
        if (!cleanPhone || !/^0\d{8,10}$/.test(cleanPhone)) {
            setError("Số điện thoại không hợp lệ (VD: 0912345678)");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/me/link-phone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleanPhone }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setSuccess(data.message);
                // Refresh auth context
                await refresh();
                // Redirect after 1.5s
                setTimeout(() => {
                    const dest = data.user?.role === "ADMIN" ? "/admin/dashboard" : "/calendar";
                    router.replace(dest);
                }, 1500);
            } else {
                setError(data.error || "Lỗi cập nhật số điện thoại");
            }
        } catch {
            setError("Lỗi kết nối. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#233630] flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Logo + Header */}
                <div className="text-center space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-[#046839] flex items-center justify-center shadow-xl shadow-[#046839]/30 overflow-hidden">
                        <Image src="/logo-badminton.png" alt="Logo" width={80} height={80} className="object-cover" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#A5C838]">Hoàn tất đăng ký</h1>
                    <p className="text-[#E3E3D7]/60 text-sm">
                        Xin chào <strong className="text-[#A5C838]">{user?.name || "bạn"}</strong>! 👋
                        <br />
                        Vui lòng nhập số điện thoại để liên kết tài khoản.
                    </p>
                </div>

                {/* Info card */}
                <div className="bg-[#046839]/15 border border-[#A5C838]/15 rounded-xl px-4 py-3 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[#A5C838] flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-[#E3E3D7]/60 leading-relaxed">
                        <p>Nếu số điện thoại đã có trong hệ thống, tài khoản Zalo sẽ được tự động liên kết với tài khoản hiện có.</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#E3E3D7]/70 flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-[#A5C838]" />
                            Số điện thoại
                        </label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#E3E3D7]/40 text-sm">
                                <span className="text-base">🇻🇳</span>
                            </div>
                            <input
                                type="tel"
                                value={formatPhoneDisplay(phone)}
                                onChange={handlePhoneChange}
                                placeholder="0912 345 678"
                                autoFocus
                                className="w-full h-13 pl-12 pr-4 rounded-xl bg-[#1a2b26] border border-[#A5C838]/20 text-[#E3E3D7] text-lg font-mono tracking-wider placeholder:text-[#E3E3D7]/20 focus:outline-none focus:ring-2 focus:ring-[#046839]/50 focus:border-[#046839] transition-all"
                            />
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Success message */}
                    {success && (
                        <div className="flex items-center gap-2 bg-[#046839]/20 border border-[#046839]/30 rounded-lg px-3 py-2 text-sm text-[#A5C838]">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={loading || phone.length < 9 || !!success}
                        className="w-full h-12 rounded-xl bg-[#A5C838] text-[#233630] font-bold text-base hover:bg-[#b5d448] transition-all shadow-lg shadow-[#A5C838]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : success ? (
                            <>
                                <CheckCircle className="h-5 w-5" />
                                Đang chuyển hướng...
                            </>
                        ) : (
                            <>
                                <Phone className="h-5 w-5" />
                                Xác nhận số điện thoại
                            </>
                        )}
                    </button>
                </form>

                {/* Skip option */}
                <div className="text-center">
                    <button
                        onClick={() => router.replace("/calendar")}
                        className="text-sm text-[#E3E3D7]/30 hover:text-[#E3E3D7]/50 transition-colors underline underline-offset-4"
                    >
                        Bỏ qua, tiếp tục không SĐT
                    </button>
                </div>
            </div>
        </div>
    );
}
