import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export interface SessionData {
    userId: string;
    phone: string;
    role: "ADMIN" | "MEMBER";
    isLoggedIn: boolean;
}

const sessionOptions = {
    password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long_000",
    cookieName: "badminton_session",
    cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax" as const, // "lax" cho phep cookie gui khi redirect tu Zalo OAuth callback
        maxAge: 60 * 60 * 24 * 30, // 30 days
    },
};

export async function getSession(): Promise<IronSession<SessionData>> {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    return session;
}

export async function requireAuth(): Promise<SessionData> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
        throw new Error("UNAUTHORIZED");
    }
    return {
        userId: session.userId,
        phone: session.phone,
        role: session.role,
        isLoggedIn: true,
    };
}

export async function requireAdmin(): Promise<SessionData> {
    const session = await requireAuth();
    if (session.role !== "ADMIN") {
        throw new Error("FORBIDDEN");
    }
    return session;
}

export function handleAuthError(error: unknown): NextResponse {
    if (error instanceof Error) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 });
        }
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Khong co quyen truy cap" }, { status: 403 });
        }
    }
    return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
}
