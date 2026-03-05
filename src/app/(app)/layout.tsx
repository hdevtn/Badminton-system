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
    MessageCircle,
    Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Image from "next/image";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const memberNav: NavItem[] = [
    { label: "Lịch sân", href: "/calendar", icon: <Calendar className="h-5 w-5" /> },
    { label: "Bảng xếp hạng", href: "/leaderboard", icon: <Trophy className="h-5 w-5" /> },
    { label: "Tài chính", href: "/me/finance", icon: <DollarSign className="h-5 w-5" /> },
    { label: "Lịch sử thanh toán", href: "/me/payments", icon: <CreditCard className="h-5 w-5" /> },
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

const memberBottomNav = [
    { label: "Lịch sân", href: "/calendar", icon: <Calendar className="h-5 w-5" /> },
    { label: "Xếp hạng", href: "/leaderboard", icon: <Trophy className="h-5 w-5" /> },
    { label: "Tài chính", href: "/me/finance", icon: <DollarSign className="h-5 w-5" /> },
    { label: "Thanh toán", href: "/me/payments", icon: <CreditCard className="h-5 w-5" /> },
];

const adminBottomNav = [
    { label: "Tổng quan", href: "/admin/dashboard", icon: <Home className="h-5 w-5" /> },
    { label: "Lịch sân", href: "/calendar", icon: <Calendar className="h-5 w-5" /> },
    { label: "Xếp hạng", href: "/leaderboard", icon: <Trophy className="h-5 w-5" /> },
    { label: "Buổi tập", href: "/admin/sessions", icon: <ClipboardList className="h-5 w-5" /> },
    { label: "Tính tiền", href: "/admin/billing", icon: <Receipt className="h-5 w-5" /> },
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
            <div className="min-h-screen flex items-center justify-center bg-[#233630]">
                <Loader2 className="h-8 w-8 animate-spin text-[#A5C838]" />
                <p className="ml-3 text-[#E3E3D7]/70">Đang tải...</p>
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
        <div className="min-h-screen flex bg-[#233630]">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Dark green */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#1a2b26] border-r border-[#A5C838]/10 flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-none",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo */}
                <div className="p-5 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#046839] flex items-center justify-center shadow-lg shadow-[#046839]/30 overflow-hidden">
                        <Image src="/logo-badminton.png" alt="Logo" width={44} height={44} className="object-cover" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight text-[#A5C838]">
                            Cầu Lông Club
                        </h2>
                        <p className="text-xs text-[#E3E3D7]/50">Hệ thống quản lý</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto lg:hidden text-[#E3E3D7]/70 hover:text-[#A5C838]"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="h-px bg-[#A5C838]/10 mx-4" />

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {isAdmin && (
                        <p className="text-[10px] font-semibold text-[#A5C838]/60 uppercase tracking-widest px-3 mb-2 mt-1">
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
                                        <div className="h-px bg-[#A5C838]/10 my-3 mx-2" />
                                        <p className="text-[10px] font-semibold text-[#A5C838]/60 uppercase tracking-widest px-3 mb-2">
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
                                            ? "bg-[#046839] text-[#A5C838] shadow-lg shadow-[#046839]/30"
                                            : "text-[rgb(247,255,220)]/70 hover:bg-[#233630] hover:text-[rgb(247,255,220)]"
                                    )}
                                >
                                    {item.icon}
                                    {item.label}
                                    {isActive && <ChevronRight className="ml-auto h-4 w-4 text-[#A5C838]/60" />}
                                </Link>
                            </div>
                        );
                    })}
                </nav>

                <div className="h-px bg-[#A5C838]/10 mx-4" />

                {/* User info */}
                <div className="p-4">
                    <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-[#233630]/80">
                        <div className="w-10 h-10 rounded-full bg-[#046839] flex items-center justify-center overflow-hidden ring-2 ring-[#A5C838]/20">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-semibold text-[#A5C838]">
                                    {(user.name || user.phone)?.[0]?.toUpperCase() || "U"}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#E3E3D7] truncate">{user.name || user.phone}</p>
                            <p className="text-xs text-[#A5C838]/60">{roleLabel}</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-[#A5C838]/15 text-[#E3E3D7]/60 hover:bg-red-900/30 hover:text-red-400 hover:border-red-500/30 transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Đăng xuất
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">
                {/* Mobile header */}
                <header className="lg:hidden sticky top-0 z-30 bg-[#1a2b26]/97 backdrop-blur-xl border-b border-[#A5C838]/10 px-4 py-3 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#E3E3D7]/70 hover:text-[#A5C838]"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <h1 className="font-bold text-[#A5C838]">
                        🏸 Cầu Lông Club
                    </h1>
                </header>

                <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-fade-in pb-24 lg:pb-8">
                    {children}
                </div>
            </main>

            {/* ===== MOBILE BOTTOM BAR ===== */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
                <div className="h-[2px] bg-gradient-to-r from-[#046839] via-[#A5C838] to-[#046839]" />
                <div className="bg-[rgb(35,54,48)] backdrop-blur-xl border-t border-[#A5C838]/10">
                    <div className="flex items-center justify-around h-16 px-1">
                        {bottomNavItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 px-1 py-1 rounded-xl transition-all duration-200",
                                        isActive
                                            ? "text-[rgb(235,255,172)]"
                                            : "text-[rgb(235,255,172)]/40 hover:text-[rgb(235,255,172)]/70"
                                    )}
                                >
                                    <div className={cn(
                                        "p-1.5 rounded-xl transition-all duration-200",
                                        isActive && "bg-[#046839] shadow-lg shadow-[#046839]/40"
                                    )}>
                                        {item.icon}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-medium truncate max-w-full",
                                        isActive && "font-bold text-[#A5C838]"
                                    )}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </div>
    );
}
