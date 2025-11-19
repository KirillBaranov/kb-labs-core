import type { ConfigureOpts, LogLevel, LogRecord, LogSink, Logger, Redactor } from "./types";
import { recordLogWritten, recordLogDropped, recordSinkFailure, recordSinkSuccess } from "./metrics.js";
import { getLogContext } from "./context.js";
import { getGlobalState, type LoggingState } from "./state.js";
import { enrichLogRecord } from "./ai-enrichment.js";

const LEVEL_ORDER: Record<LogLevel, number> = { trace: 5, debug: 10, info: 20, warn: 30, error: 40 };

function getGlobalLevel(): LogLevel {
    return getGlobalState().globalLevel;
}

function setGlobalLevel(level: LogLevel): void {
    getGlobalState().globalLevel = level;
}

export function configureLogger(opts: ConfigureOpts): void {
    const state = getGlobalState();
    
    if (opts.level) {
        state.globalLevel = opts.level;
    }
    
    // Handle sinks: replace if first init or explicitly requested, otherwise add
    if (opts.sinks) {
        const shouldReplace = opts.replaceSinks !== undefined 
            ? opts.replaceSinks 
            : !state.initialized; // Default: replace on first init, add after
        
        if (shouldReplace) {
            state.sinks = [...opts.sinks];
        } else {
            // Add new sinks that aren't already present
            for (const sink of opts.sinks) {
                if (!state.sinks.includes(sink)) {
                    state.sinks.push(sink);
                }
            }
        }
        state.initialized = true;
    }
    
    if (opts.redactor !== undefined) { state.redactor = opts.redactor; }
    if (opts.categoryFilter !== undefined) { state.categoryFilter = opts.categoryFilter; }
    if (opts.clock) { state.clock = opts.clock; }
}

export function addSink(sink: LogSink): void {
    const state = getGlobalState();
    state.sinks.push(sink);
}

export function removeSink(sink: LogSink): void {
    const state = getGlobalState();
    state.sinks = state.sinks.filter(s => s !== sink);
}

export function setLogLevel(level: LogLevel): void {
    const state = getGlobalState();
    const previousLevel = state.globalLevel;
    state.globalLevel = level;
    
    // Log level change (only if debug enabled)
    if (level === 'debug' || previousLevel === 'debug') {
        // Use a logger instance to avoid circular dependency
        // We can't use getLogger here because it might not be initialized yet
        // So we'll skip logging level changes during initialization
    }
}

export function getLogLevel(): LogLevel {
    return getGlobalLevel();
}

function allowedCategory(cat?: string): boolean {
    const state = getGlobalState();
    const categoryFilter = state.categoryFilter;
    if (!categoryFilter) {return true;}
    if (Array.isArray(categoryFilter)) {return !cat ? false : categoryFilter.includes(cat);}
    return !!cat && categoryFilter.test(cat);
}

async function fanout(rec: LogRecord): Promise<void> {
    const state = getGlobalState();
    const prepared = state.redactor ? state.redactor(rec) : rec;
    
    // Record log written
    recordLogWritten(rec.level);
    
    // Fan out to all sinks
    for (const s of state.sinks) {
        const sinkId = s.id || `sink-${state.sinks.indexOf(s)}`;
        try {
            await s.handle(prepared);
            recordSinkSuccess(sinkId);
        } catch (err) {
            // Never throw - sink failures should not break execution
            const error = err instanceof Error ? err : new Error(String(err));
            recordSinkFailure(sinkId, error);
        }
    }
}

function baseLogger(bindings?: { category?: string; meta?: Record<string, unknown> }): Logger {
    const boundCat = bindings?.category;
    const boundMeta = bindings?.meta ?? {};

    function emit(level: LogLevel, msg: string, meta?: Record<string, unknown> | Error) {
        const state = getGlobalState();
        
        // Filter by global log level first
        if (LEVEL_ORDER[level] < LEVEL_ORDER[state.globalLevel]) {
            recordLogDropped();
            return;
        }
        // Filter by category if configured
        if (!allowedCategory(boundCat)) {
            recordLogDropped();
            return;
        }

        let err: LogRecord["err"] | undefined;
        let attach: Record<string, unknown> | undefined;

        if (meta instanceof Error) {
            err = { name: meta.name, message: meta.message, stack: meta.stack };
        } else {
            attach = meta;
        }

        // Get current logging context (traceId, spanId, etc.)
        const logContext = getLogContext();
        
        const rec: LogRecord = {
            time: state.clock().toISOString(),
            level,
            category: boundCat,
            msg,
            trace: logContext?.traceId,
            span: logContext?.spanId,
            parentSpan: logContext?.parentSpanId,
            executionId: logContext?.executionId,
            meta: Object.keys(boundMeta).length || attach ? { ...boundMeta, ...attach } : undefined,
            err,
        };
        
        // Enrich with AI fields if AI is enabled
        const enrichedRec = state.aiConfig?.mode !== 'off' 
            ? enrichLogRecord(rec)
            : rec;
        
        void fanout(enrichedRec);
    }

    return {
        debug: (m, m2) => emit("debug", m, m2),
        info:  (m, m2) => emit("info",  m, m2),
        warn:  (m, m2) => emit("warn",  m, m2),
        error: (m, m2) => emit("error", m, m2),
        child: (b) => baseLogger({ category: b.category ?? boundCat, meta: { ...boundMeta, ...(b.meta ?? {}) } }),
    };
}

// Lazy import для избежания циклических зависимостей
let ensureLoggingInitialized: (() => void) | null = null;

function lazyLoadAutoInit(): void {
    if (ensureLoggingInitialized) {
        ensureLoggingInitialized();
        return;
    }
    
    if (typeof process !== 'undefined' && process.env) {
        try {
            // Используем синхронный require для немедленной инициализации
            // Это безопасно так как auto-init не зависит от logger
            const autoInit = require('./auto-init.js');
            if (autoInit && typeof autoInit.ensureLoggingInitialized === 'function') {
                const initFn = autoInit.ensureLoggingInitialized;
                ensureLoggingInitialized = initFn;
                initFn();
            }
        } catch {
            // Если auto-init недоступен, это нормально - значит инициализация уже произошла
            // или мы в браузере где require может не работать
        }
    }
}

export function getLogger(category?: string): Logger {
    // Автоматически инициализировать при первом вызове (zero config)
    lazyLoadAutoInit();
    
    return baseLogger({ category });
}

/** Generic ENV bootstrap (no product-specific vars). */
export function configureFromEnv(env: NodeJS.ProcessEnv = process.env): void {
    const lvl = (env.LOG_LEVEL ?? "").toLowerCase();
    if (lvl === "debug" || lvl === "info" || lvl === "warn" || lvl === "error") {setLogLevel(lvl as LogLevel);}

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