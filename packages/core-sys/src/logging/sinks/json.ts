import type { LogRecord, LogSink } from "../types";

/** Deterministic JSON sink for CI/log collectors - writes to stderr */
export const jsonSink: LogSink = {
    handle(rec: LogRecord) {
        // Ensure stable order: time, level, category, trace, span, parentSpan, executionId, msg, err, meta
        const payload: Record<string, unknown> = {};
        payload.time = rec.time;
        payload.level = rec.level;
        if (rec.category) {payload.category = rec.category;}
        if (rec.trace) {payload.trace = rec.trace;}
        if (rec.span) {payload.span = rec.span;}
        if (rec.parentSpan) {payload.parentSpan = rec.parentSpan;}
        if (rec.executionId) {payload.executionId = rec.executionId;}
        if (rec.plugin) {payload.plugin = rec.plugin;}
        if (rec.command) {payload.command = rec.command;}
        if (rec.msg) {payload.msg = rec.msg;}
        if (rec.err) {
            // Include full stack trace for errors in JSON mode (for AI/service parsing)
            payload.err = {
                name: rec.err.name,
                message: rec.err.message,
                stack: rec.err.stack,  // Always include stack trace
                code: rec.err.code,
            };
        }
        if (rec.meta) {payload.meta = rec.meta;}
        // Write to stderr (not stdout) - logs go to stderr, UI output goes to stdout
        process.stderr.write(JSON.stringify(payload) + "\n");
    }
};