export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

// Уровни verbosity (пользовательские)
export type VerbosityLevel = "quiet" | "normal" | "verbose" | "debug" | "inspect";

// Режимы вывода
export type OutputMode = "tty" | "pipe" | "ci" | "json";

// Формат debug вывода
export type DebugFormat = "human" | "ai";

export interface LogRecord {
    time: string;                // ISO timestamp (legacy, use ts)
    ts?: string;                 // ISO timestamp (new)
    level: LogLevel;
    category?: string;           // e.g. "core", "ai-review", "provider"
    plugin?: string;             // ID плагина
    command?: string;            // ID команды
    trace?: string;              // Trace ID
    span?: string;               // Span ID
    msg?: string;
    err?: { name: string; message: string; stack?: string; code?: string };
    meta?: Record<string, unknown>;
    metrics?: {                 // Метрики
        duration?: number;
        memory?: number;
        [key: string]: unknown;
    };
}

export interface LogSink {
    handle(rec: LogRecord): void | Promise<void>;
}

export interface Redactor {
    (rec: LogRecord): LogRecord;
}

export interface ConfigureOpts {
    level?: LogLevel;
    sinks?: LogSink[];                   // replaces sinks if provided
    replaceSinks?: boolean;              // if true, replace all sinks; if false, add to existing (default: true for first init, false after)
    redactor?: Redactor | null;          // null disables redaction
    categoryFilter?: string[] | RegExp;  // allow-list; empty => all
    clock?: () => Date;                  // for tests
}

export interface Logger {
    debug(msg: string, meta?: Record<string, unknown>): void;
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown> | Error): void;
    child(bindings: { category?: string; meta?: Record<string, unknown> }): Logger;
}