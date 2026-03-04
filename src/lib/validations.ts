import { z } from "zod";

// ============================================================
// AUTH
// ============================================================

export const loginSchema = z.object({
    phone: z.string().min(9, "Số điện thoại không hợp lệ").max(15),
});

export const requestOtpSchema = z.object({
    phone: z.string().min(9).max(15),
});

export const verifyOtpSchema = z.object({
    phone: z.string().min(9).max(15),
    code: z.string().length(6, "Mã OTP phải có 6 ký tự"),
});

// ============================================================
// COURTS
// ============================================================

export const createCourtSchema = z.object({
    name: z.string().min(1, "Tên sân không được để trống").max(100),
    location: z.string().max(255).optional(),
    description: z.string().optional(),
    passEnabled: z.boolean().default(false),
    maxCheckin: z.number().int().min(1).max(50).default(8),
    defaultCourtFee: z.number().min(0).default(0),
    hourlyRate: z.number().min(0).default(0),
});

export const updateCourtSchema = createCourtSchema.partial();

// ============================================================
// PLAYERS
// ============================================================

export const createPlayerSchema = z.object({
    fullName: z.string().min(1, "Tên người chơi không được để trống").max(100),
    phone: z.string().min(9).max(15).optional(),
    type: z.enum(["FIXED", "GUEST"]).default("FIXED"),
    guestFeeOverride: z.number().min(0).nullable().optional(),
});

export const updatePlayerSchema = createPlayerSchema.partial();

export const importRosterSchema = z.object({
    players: z.array(
        z.object({
            fullName: z.string().min(1).max(100),
            phone: z.string().min(9).max(15).optional(),
            type: z.enum(["FIXED", "GUEST"]).default("FIXED"),
            guestFeeOverride: z.number().min(0).nullable().optional(),
        })
    ),
});

// ============================================================
// SCHEDULES
// ============================================================

export const generateMonthSchema = z.object({
    courtId: z.string().min(1),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
    rules: z.array(
        z.object({
            dayOfWeek: z.number().int().min(0).max(6), // 0=Sunday
            startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm"),
            endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm"),
            courtFeeOverride: z.number().min(0).optional(),
        })
    ),
});

// ============================================================
// SESSIONS
// ============================================================

export const updateSessionSchema = z.object({
    courtFee: z.number().min(0).optional(),
    shuttleFee: z.number().min(0).optional(),
    passStatus: z.enum(["NONE", "TRYING", "SUCCESS", "FAILED"]).optional(),
    remindAt: z.string().datetime().optional().nullable(),
    status: z.enum(["OPEN", "CLOSED"]).optional(),
});

// ============================================================
// ATTENDANCE
// ============================================================

export const checkinSchema = z.object({
    playerId: z.string().min(1),
    attending: z.boolean(),
});

// ============================================================
// BILLING
// ============================================================

export const generateInvoicesSchema = z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-MM"),
});

export const manualPaymentSchema = z.object({
    invoiceId: z.string().min(1),
    amount: z.number().min(0),
    refCode: z.string().optional(),
});

// ============================================================
// SETTINGS
// ============================================================

export const updateSettingsSchema = z.record(z.string(), z.unknown());

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type GenerateMonthInput = z.infer<typeof generateMonthSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
