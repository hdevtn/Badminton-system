import prisma from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { Decimal } from "@prisma/client/runtime/library";
import { logger } from "@/lib/logger";

export interface SessionChargeResult {
    sessionId: string;
    courtFeeNet: number;
    shuttleFee: number;
    guestTotal: number;
    netCost: number;
    fixedUnit: number;
    delta: number;
    charges: {
        playerId: string;
        type: "GUEST" | "FIXED" | "DELTA";
        amount: number;
    }[];
}

export async function calculateSessionCharges(sessionId: string): Promise<SessionChargeResult> {
    const session = await prisma.session.findUniqueOrThrow({
        where: { id: sessionId },
        include: {
            attendances: {
                include: { player: true },
            },
        },
    });

    const guestFeeDefault = await getSetting("guest_fee_default");
    const deltaHandling = await getSetting("delta_handling");

    const courtFee = Number(session.courtFee);
    const shuttleFee = Number(session.shuttleFee);
    const passSuccess = session.passStatus === "SUCCESS";

    // Separate attendees by type
    const fixedAttendees = session.attendances.filter(
        (a) => a.attending && a.player.type === "FIXED"
    );
    const guestAttendees = session.attendances.filter(
        (a) => a.attending && a.player.type === "GUEST"
    );

    // Get ALL fixed roster players (not just attending ones)
    const fixedRoster = await prisma.player.findMany({
        where: { type: "FIXED", active: true },
    });

    const fixedRosterCount = fixedRoster.length;

    // Step 1: Court fee net
    const courtFeeNet = passSuccess ? 0 : courtFee;

    // Step 2: Guest payments
    const charges: SessionChargeResult["charges"] = [];

    let guestTotal = 0;
    for (const ga of guestAttendees) {
        const guestFee = passSuccess
            ? 0
            : Number(ga.player.guestFeeOverride) || guestFeeDefault;
        guestTotal += guestFee;
        charges.push({
            playerId: ga.playerId,
            type: "GUEST",
            amount: guestFee,
        });
    }

    // Step 3: Net cost
    const netCost = courtFeeNet + shuttleFee - guestTotal;

    // Step 4: Fixed unit (divide by TOTAL fixed roster, not just attendees)
    const fixedUnit = fixedRosterCount > 0 ? netCost / fixedRosterCount : 0;

    // Step 5: Fixed charges (only for attending)
    for (const fa of fixedAttendees) {
        charges.push({
            playerId: fa.playerId,
            type: "FIXED",
            amount: fixedUnit,
        });
    }

    // Step 6: Delta
    const fixedAttendeeCount = fixedAttendees.length;
    const delta = netCost - fixedUnit * fixedAttendeeCount;

    // Handle delta based on setting
    if (Math.abs(delta) > 0.01 && deltaHandling !== "carry_to_next") {
        if (deltaHandling === "split_among_attendees" && fixedAttendeeCount > 0) {
            const deltaPerPerson = delta / fixedAttendeeCount;
            for (const fa of fixedAttendees) {
                charges.push({
                    playerId: fa.playerId,
                    type: "DELTA",
                    amount: deltaPerPerson,
                });
            }
        } else if (deltaHandling === "split_among_roster" && fixedRosterCount > 0) {
            const deltaPerPerson = delta / fixedRosterCount;
            for (const rp of fixedRoster) {
                charges.push({
                    playerId: rp.id,
                    type: "DELTA",
                    amount: deltaPerPerson,
                });
            }
        }
    }

    return {
        sessionId,
        courtFeeNet,
        shuttleFee,
        guestTotal,
        netCost,
        fixedUnit,
        delta,
        charges,
    };
}

export async function saveSessionCharges(result: SessionChargeResult): Promise<void> {
    await prisma.$transaction(async (tx) => {
        // Delete existing charges for this session
        await tx.charge.deleteMany({
            where: { sessionId: result.sessionId },
        });

        // Create new charges
        if (result.charges.length > 0) {
            await tx.charge.createMany({
                data: result.charges.map((c) => ({
                    sessionId: result.sessionId,
                    playerId: c.playerId,
                    type: c.type,
                    amountDecimal: new Decimal(c.amount),
                    metaJson: {
                        courtFeeNet: result.courtFeeNet,
                        shuttleFee: result.shuttleFee,
                        guestTotal: result.guestTotal,
                        netCost: result.netCost,
                        fixedUnit: result.fixedUnit,
                        delta: result.delta,
                    },
                })),
            });
        }

        logger.info("billing", `Charges saved for session ${result.sessionId}`, {
            chargeCount: result.charges.length,
            netCost: result.netCost,
            delta: result.delta,
        });
    });
}
