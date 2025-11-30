import type { LogRecord, Redactor } from "./types";

/** Simple key-based redactor; masks values by key in meta recursively. */
export function createRedactor(opts?: { keys?: string[]; mask?: string }): Redactor {
    // Default sensitive keys: tokens, API keys, passwords, env variables
    const defaultKeys = [
        "token", "apiKey", "apikey", "api_key", "api-key",
        "authorization", "authorization",
        "secret", "secretKey", "secret_key", "secret-key",
        "accessToken", "access_token", "access-token",
        "refreshToken", "refresh_token", "refresh-token",
        "authToken", "auth_token", "auth-token",
        "bearerToken", "bearer_token", "bearer-token",
        "password", "passwd", "pwd",
        "privateKey", "private_key", "private-key",
        "env", "environment", "config", // Env variables that might contain secrets
    ];
    const keys = new Set((opts?.keys ?? defaultKeys).map(k => k.toLowerCase()));
    const mask = opts?.mask ?? "****";

    function redactValue(v: unknown, path: string[] = []): unknown {
        if (v && typeof v === "object" && !Array.isArray(v)) {
            const out: Record<string, unknown> = {};
            for (const [k, val] of Object.entries(v as any)) {
                out[k] = keys.has(k.toLowerCase()) ? mask : redactValue(val, path.concat(k));
            }
            return out;
        }
        if (Array.isArray(v)) {return v.map((x) => redactValue(x, path));}
        return v;
    }

    return (rec: LogRecord) => {
        const meta = rec.meta ? (redactValue(rec.meta) as Record<string, unknown>) : undefined;
        return meta ? { ...rec, meta } : rec;
    };
}