import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/lib/session";
import { calculateSessionCharges, saveSessionCharges } from "@/lib/billing-engine";
import { logger } from "@/lib/logger";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();

        const result = await calculateSessionCharges(params.id);
        await saveSessionCharges(result);

        logger.info("billing", `Recalculated charges for session ${params.id}`);

        return NextResponse.json({ result });
    } catch (error) {
        return handleAuthError(error);
    }
}
