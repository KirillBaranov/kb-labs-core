import type { LogRecord, Redactor } from "./types";

/** Simple key-based redactor; masks values by key in meta recursively. */
export function createRedactor(opts?: { keys?: string[]; mask?: string }): Redactor {
    const keys = new Set((opts?.keys ?? ["token", "apiKey", "authorization"]).map(k => k.toLowerCase()));
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