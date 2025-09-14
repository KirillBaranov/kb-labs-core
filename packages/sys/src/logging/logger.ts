import { ConfigureOpts, LogLevel, LogRecord, LogSink, Logger, Redactor } from "./types";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

let globalLevel: LogLevel = "info";
let sinks: LogSink[] = [];
let redactor: Redactor | null = null;
let categoryFilter: ConfigureOpts["categoryFilter"];
let clock: () => Date = () => new Date();

export function configureLogger(opts: ConfigureOpts): void {
    if (opts.level) globalLevel = opts.level;
    if (opts.sinks) sinks = [...opts.sinks];
    if (opts.redactor !== undefined) redactor = opts.redactor;
    if (opts.categoryFilter !== undefined) categoryFilter = opts.categoryFilter;
    if (opts.clock) clock = opts.clock;
}

export function addSink(sink: LogSink): void { sinks.push(sink); }
export function removeSink(sink: LogSink): void { sinks = sinks.filter(s => s !== sink); }
export function setLogLevel(level: LogLevel): void { globalLevel = level; }

function allowedCategory(cat?: string): boolean {
    if (!categoryFilter) return true;
    if (Array.isArray(categoryFilter)) return !cat ? false : categoryFilter.includes(cat);
    return !!cat && categoryFilter.test(cat);
}

async function fanout(rec: LogRecord): Promise<void> {
    const prepared = redactor ? redactor(rec) : rec;
    for (const s of sinks) {
        try { await s.handle(prepared); } catch { /* never throw */ }
    }
}

function baseLogger(bindings?: { category?: string; meta?: Record<string, unknown> }): Logger {
    const boundCat = bindings?.category;
    const boundMeta = bindings?.meta ?? {};

    function emit(level: LogLevel, msg: string, meta?: Record<string, unknown> | Error) {
        if (LEVEL_ORDER[level] < LEVEL_ORDER[globalLevel]) return;
        if (!allowedCategory(boundCat)) return;

        let err: LogRecord["err"] | undefined;
        let attach: Record<string, unknown> | undefined;

        if (meta instanceof Error) {
            err = { name: meta.name, message: meta.message, stack: meta.stack };
        } else {
            attach = meta;
        }

        const rec: LogRecord = {
            time: clock().toISOString(),
            level,
            category: boundCat,
            msg,
            meta: Object.keys(boundMeta).length || attach ? { ...boundMeta, ...attach } : undefined,
            err,
        };
        void fanout(rec);
    }

    return {
        debug: (m, m2) => emit("debug", m, m2),
        info:  (m, m2) => emit("info",  m, m2),
        warn:  (m, m2) => emit("warn",  m, m2),
        error: (m, m2) => emit("error", m, m2),
        child: (b) => baseLogger({ category: b.category ?? boundCat, meta: { ...boundMeta, ...(b.meta ?? {}) } }),
    };
}

export function getLogger(category?: string): Logger {
    return baseLogger({ category });
}

/** Generic ENV bootstrap (no product-specific vars). */
export function configureFromEnv(env: NodeJS.ProcessEnv = process.env): void {
    const lvl = (env.LOG_LEVEL ?? "").toLowerCase();
    if (lvl === "debug" || lvl === "info" || lvl === "warn" || lvl === "error") setLogLevel(lvl as LogLevel);

    const filter = env.LOG_CATEGORY_FILTER;
    if (filter?.length) {
        if (filter.startsWith("/") && filter.endsWith("/")) {
            const re = new RegExp(filter.slice(1, -1));
            configureLogger({ categoryFilter: re });
        } else {
            configureLogger({ categoryFilter: filter.split(",").map(s => s.trim()).filter(Boolean) });
        }
    }
}