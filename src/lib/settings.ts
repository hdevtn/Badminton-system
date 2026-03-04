import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface SettingsMap {
    guest_fee_default: number;
    remind_threshold: number;
    delta_handling: "carry_to_next" | "split_among_attendees" | "split_among_roster";
    auth_require_otp: boolean;
    default_shuttle_fee: number;
    remind_offset_hours: number;
}

const DEFAULTS: SettingsMap = {
    guest_fee_default: 50000,
    remind_threshold: 4,
    delta_handling: "carry_to_next",
    auth_require_otp: false,
    default_shuttle_fee: 0,
    remind_offset_hours: 6,
};

export async function getSetting<K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K]> {
    try {
        const row = await prisma.setting.findUnique({ where: { key } });
        if (row) {
            return row.valueJson as SettingsMap[K];
        }
    } catch (e) {
        logger.error("settings", `Failed to read setting ${key}`, e);
    }
    return DEFAULTS[key];
}

export async function getAllSettings(): Promise<SettingsMap> {
    const rows = await prisma.setting.findMany();
    const result = { ...DEFAULTS };
    for (const row of rows) {
        if (row.key in DEFAULTS) {
            (result as Record<string, unknown>)[row.key] = row.valueJson;
        }
    }
    return result;
}

export async function setSetting<K extends keyof SettingsMap>(
    key: K,
    value: SettingsMap[K]
): Promise<void> {
    await prisma.setting.upsert({
        where: { key },
        update: { valueJson: value as any },
        create: { key, valueJson: value as any },
    });
}

export async function setSettings(updates: Partial<SettingsMap>): Promise<void> {
    const ops = Object.entries(updates).map(([key, value]) =>
        prisma.setting.upsert({
            where: { key },
            update: { valueJson: value as any },
            create: { key, valueJson: value as any },
        })
    );
    await prisma.$transaction(ops);
}
