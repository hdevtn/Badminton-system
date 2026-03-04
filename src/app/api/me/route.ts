import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
    try {
        const session = await getSession();

        if (!session.isLoggedIn || !session.userId) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: {
                player: {
                    select: {
                        id: true,
                        fullName: true,
                        type: true,
                    },
                },
            },
        });

        if (!user || user.status !== "ACTIVE") {
            session.destroy();
            return NextResponse.json({ user: null }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
                avatarUrl: user.avatarUrl,
                zaloId: user.zaloId,
                player: user.player,
            },
        });
    } catch {
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
