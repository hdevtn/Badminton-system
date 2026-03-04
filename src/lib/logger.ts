type LogLevel = "info" | "warn" | "error" | "debug";

function formatMessage(level: LogLevel, module: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}${dataStr}`;
}

export const logger = {
    info(module: string, message: string, data?: unknown) {
        console.log(formatMessage("info", module, message, data));
    },
    warn(module: string, message: string, data?: unknown) {
        console.warn(formatMessage("warn", module, message, data));
    },
    error(module: string, message: string, data?: unknown) {
        console.error(formatMessage("error", module, message, data));
    },
    debug(module: string, message: string, data?: unknown) {
        if (process.env.NODE_ENV === "development") {
            console.debug(formatMessage("debug", module, message, data));
        }
    },
};
