import IORedis from "ioredis";
import { logger } from "@/lib/logger";

let redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
    if (!redisConnection) {
        const url = process.env.REDIS_URL || "redis://localhost:6379";
        try {
            redisConnection = new IORedis(url, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
                lazyConnect: true,
            });
            redisConnection.on("error", (err) => {
                logger.error("redis", "Connection error", err.message);
            });
            redisConnection.on("connect", () => {
                logger.info("redis", "Connected");
            });
        } catch (error) {
            logger.error("redis", "Failed to create Redis connection", error);
            // Return a dummy connection that won't crash the app
            redisConnection = new IORedis({ lazyConnect: true, maxRetriesPerRequest: null });
        }
    }
    return redisConnection;
}
