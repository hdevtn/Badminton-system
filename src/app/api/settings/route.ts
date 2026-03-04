import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth, handleAuthError } from "@/lib/session";
import { getAllSettings, setSettings } from "@/lib/settings";
import { logger } from "@/lib/logger";

export async function GET() {
    try {
        await requireAuth();
        const settings = await getAllSettings();
        return NextResponse.json({ settings });
    } catch (error) {
        return handleAuthError(error);
    }
}

export async function PATCH(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        await setSettings(body);

        const settings = await getAllSettings();

        logger.info("settings", "Settings updated", body);

        return NextResponse.json({ settings });
    } catch (error) {
        return handleAuthError(error);
    }
}
