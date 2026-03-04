"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface User {
    id: string;
    phone: string;
    name: string | null;
    role: "ADMIN" | "MEMBER";
    avatarUrl?: string | null;
    zaloId?: string | null;
    player?: {
        id: string;
        fullName: string;
        type: string;
    } | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (phone: string) => Promise<{ success: boolean; requiresOtp?: boolean; error?: string }>;
    requestOtp: (phone: string) => Promise<{ success: boolean; devCode?: string; error?: string }>;
    verifyOtp: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/me");
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = async (phone: string) => {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setUser(data.user);
                return { success: true };
            }
            if (data.requiresOtp) {
                return { success: false, requiresOtp: true };
            }
            return { success: false, error: data.error };
        } catch {
            return { success: false, error: "Lỗi kết nối" };
        }
    };

    const requestOtp = async (phone: string) => {
        try {
            const res = await fetch("/api/auth/request-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            if (res.ok) {
                return { success: true, devCode: data.devCode };
            }
            return { success: false, error: data.error };
        } catch {
            return { success: false, error: "Lỗi kết nối" };
        }
    };

    const verifyOtp = async (phone: string, code: string) => {
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, code }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setUser(data.user);
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch {
            return { success: false, error: "Lỗi kết nối" };
        }
    };

    const logout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, requestOtp, verifyOtp, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
