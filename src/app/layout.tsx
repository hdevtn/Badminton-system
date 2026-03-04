import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
    title: "Quản Lý Câu Lạc Bộ Cầu Lông",
    description: "Hệ thống quản lý lịch sân, điểm danh và tính tiền cầu lông",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi" suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="zalo-platform-site-verification" content="RyIFAgtx825V-gursyyD8o-nd0N3nqXJD3Os" />
            </head>
            <body className="min-h-screen">
                <AuthProvider>
                    {children}
                    <Toaster />
                </AuthProvider>
            </body>
        </html>
    );
}
