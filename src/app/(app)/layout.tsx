"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
    Calendar,
    LayoutDashboard,
    Users,
    MapPin,
    Receipt,
    Settings,
    LogOut,
    Menu,
    X,
    DollarSign,
    ClipboardList,
    ChevronRight,
    Loader2,
    CreditCard,
    ScrollText,
    Home,
    QrCode,
    MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    mobileIcon?: React.ReactNode;
}

const memberNav: NavItem[] = [
    { label: "Lịch sân", href: "/calendar", icon: <Calendar className="h-5 w-5" />, mobileIcon: <Calendar className="h-5 w-5" /> },
    { label: "Tài chính", href: "/me/finance", icon: <DollarSign className="h-5 w-5" />, mobileIcon: <DollarSign className="h-5 w-5" /> },
    { label: "Lịch sử thanh toán", href: "/me/payments", icon: <CreditCard className="h-5 w-5" />, mobileIcon: <CreditCard className="h-5 w-5" /> },
];

const adminNav: NavItem[] = [
    { label: "Bảng điều khiển", href: "/admin/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Sân cầu", href: "/admin/courts", icon: <MapPin className="h-5 w-5" /> },
    { label: "Người chơi", href: "/admin/players", icon: <Users className="h-5 w-5" /> },
    { label: "Lịch tháng", href: "/admin/schedules", icon: <Calendar className="h-5 w-5" /> },
    { label: "Buổi tập", href: "/admin/sessions", icon: <ClipboardList className="h-5 w-5" /> },
    { label: "Tính tiền", href: "/admin/billing", icon: <Receipt className="h-5 w-5" /> },
    { label: "Log thanh toán", href: "/admin/payment-logs", icon: <ScrollText className="h-5 w-5" /> },
    { label: "Gửi Zalo", href: "/admin/zalo-notify", icon: <MessageCircle className="h-5 w-5" /> },
    { label: "Cài đặt", href: "/admin/settings", icon: <Settings className="h-5 w-5" /> },
];

// Bottom bar items cho mobile (tối đa 5)
const memberBottomNav = [
    { label: "Lịch sân", href: "/calendar", icon: <Calendar className="h-5 w-5" /> },
    { label: "Tài chính", href: "/me/finance", icon: <DollarSign className="h-5 w-5" /> },
    { label: "Thanh toán", href: "/me/payments", icon: <CreditCard className="h-5 w-5" /> },
];

const adminBottomNav = [
    { label: "Tổng quan", href: "/admin/dashboard", icon: <Home className="h-5 w-5" /> },
    { label: "Lịch sân", href: "/calendar", icon: <Calendar className="h-5 w-5" /> },
    { label: "Buổi tập", href: "/admin/sessions", icon: <ClipboardList className="h-5 w-5" /> },
    { label: "Tính tiền", href: "/admin/billing", icon: <Receipt className="h-5 w-5" /> },
    { label: "Log TT", href: "/admin/payment-logs", icon: <ScrollText className="h-5 w-5" /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Đang tải...</p>
            </div>
        );
    }

    if (!user) return null;

    const isAdmin = user.role === "ADMIN";
    const navItems = isAdmin ? [...adminNav, ...memberNav] : memberNav;
    const bottomNavItems = isAdmin ? adminBottomNav : memberBottomNav;

    const handleLogout = async () => {
        await logout();
        router.replace("/login");
    };

    const roleLabel = user.role === "ADMIN" ? "Quản trị viên" : "Thành viên";

    return (
        <div className="min-h-screen flex bg-slate-50/50 dark:bg-slate-950">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 shadow-xl lg:shadow-none",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo */}
                <div className="p-5 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <span className="text-white font-bold text-lg">🏸</span>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Cầu Lông Club
                        </h2>
                        <p className="text-xs text-muted-foreground">Hệ thống quản lý</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <Separator />

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {isAdmin && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                            Quản trị
                        </p>
                    )}
                    {navItems.map((item, idx) => {
                        const showSeparator = isAdmin && idx === adminNav.length;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <div key={item.href}>
                                {showSeparator && (
                                    <>
                                        <Separator className="my-3" />
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                                            Cá nhân
                                        </p>
                                    </>
                                )}
                                <Link
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/10"
                                            : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                                    )}
                                >
                                    {item.icon}
                                    {item.label}
                                    {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                                </Link>
                            </div>
                        );
                    })}
                </nav>

                <Separator />

                {/* Thông tin người dùng */}
                <div className="p-4">
                    <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-sm font-semibold text-white">
                                    {(user.name || user.phone)?.[0]?.toUpperCase() || "U"}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name || user.phone}</p>
                            <p className="text-xs text-muted-foreground">{roleLabel}</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Đăng xuất
                    </Button>
                </div>
            </aside>

            {/* Nội dung chính */}
            <main className="flex-1 min-w-0">
                {/* Mobile header */}
                <header className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 shadow-sm">
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <h1 className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Cầu Lông Club
                    </h1>
                </header>

                <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-fade-in pb-20 lg:pb-8">
                    {children}
                </div>
            </main>

            {/* ===== MOBILE BOTTOM BAR ===== */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
                <div className="flex items-center justify-around h-16 px-1">
                    {bottomNavItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 px-1 py-1 rounded-lg transition-all duration-200",
                                    isActive
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1 rounded-lg transition-all duration-200",
                                    isActive && "bg-blue-100 dark:bg-blue-900/50"
                                )}>
                                    {item.icon}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium truncate max-w-full",
                                    isActive && "font-semibold"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
