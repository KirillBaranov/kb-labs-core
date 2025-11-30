export interface FindNearestConfigOpts {
    startDir?: string;
    stopDir?: string;             // stop climbing at/before this dir (e.g., repo root)
    filenames: string[];          // e.g., [".kb-labsrc.json", ".sentinelrc.json"]
}