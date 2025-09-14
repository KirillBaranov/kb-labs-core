export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
    time: string;                // ISO timestamp
    level: LogLevel;
    category?: string;           // e.g. "core", "ai-review", "provider"
    msg?: string;
    err?: { name: string; message: string; stack?: string };
    meta?: Record<string, unknown>;
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