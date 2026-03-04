import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

// Simple in-memory rate limiter (for single instance; use Redis for multi-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
};

export function checkRateLimit(
    key: string,
    config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
        return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
    }

    entry.count++;
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    if (!allowed) {
        logger.warn("rate-limit", `Rate limit exceeded for key: ${key}`);
    }

    return { allowed, remaining, resetAt: entry.resetAt };
}

export function getRateLimitKey(req: NextRequest, phone?: string): string {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (phone) {
        return `auth:${ip}:${phone}`;
    }
    return `auth:${ip}`;
}

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetAt) {
            rateLimitMap.delete(key);
        }
    }
}, 60 * 1000);
