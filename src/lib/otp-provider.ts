import { logger } from "@/lib/logger";

interface OtpProvider {
    name: string;
    sendOtp(phone: string): Promise<{ success: boolean; code?: string }>;
    verifyOtp(phone: string, code: string): Promise<boolean>;
}

// Dev OTP provider - always uses "123456"
class DevOtpProvider implements OtpProvider {
    name = "dev";
    private otpStore = new Map<string, { code: string; expiresAt: number }>();

    async sendOtp(phone: string): Promise<{ success: boolean; code?: string }> {
        const code = "123456";
        this.otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
        logger.info("otp-dev", `OTP for ${phone}: ${code}`);
        return { success: true, code };
    }

    async verifyOtp(phone: string, code: string): Promise<boolean> {
        const entry = this.otpStore.get(phone);
        if (!entry) return false;
        if (Date.now() > entry.expiresAt) {
            this.otpStore.delete(phone);
            return false;
        }
        const valid = entry.code === code;
        if (valid) this.otpStore.delete(phone);
        return valid;
    }
}

// Firebase OTP provider (placeholder for future integration)
class FirebaseOtpProvider implements OtpProvider {
    name = "firebase";

    async sendOtp(phone: string): Promise<{ success: boolean; code?: string }> {
        logger.info("otp-firebase", `Would send OTP to ${phone} via Firebase`);
        // TODO: Implement Firebase Phone Auth
        return { success: false };
    }

    async verifyOtp(phone: string, code: string): Promise<boolean> {
        logger.info("otp-firebase", `Would verify OTP for ${phone}`);
        // TODO: Implement Firebase Phone Auth
        return false;
    }
}

// Factory
let currentProvider: OtpProvider | null = null;

export function getOtpProvider(): OtpProvider {
    if (!currentProvider) {
        const providerName = process.env.OTP_PROVIDER || "dev";
        switch (providerName) {
            case "firebase":
                currentProvider = new FirebaseOtpProvider();
                break;
            default:
                currentProvider = new DevOtpProvider();
        }
        logger.info("otp", `Using OTP provider: ${currentProvider.name}`);
    }
    return currentProvider;
}
