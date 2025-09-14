export type Diagnostic =
    | { level: "warn" | "error"; code: string; message: string; detail?: unknown }
    | { level: "info"; code: string; message: string };

export type JsonReadResult<T = unknown> =
    | { ok: true; data: T; diagnostics: Diagnostic[] }
    | { ok: false; diagnostics: Diagnostic[] };

export interface FindNearestConfigOpts {
    startDir?: string;
    stopDir?: string;             // stop climbing at/before this dir (e.g., repo root)
    filenames: string[];          // e.g., [".kb-labsrc.json", ".sentinelrc.json"]
}