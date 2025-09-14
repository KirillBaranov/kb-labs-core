import { LogRecord, LogSink } from "../types";

/** Deterministic JSON sink for CI/log collectors. */
export const jsonSink: LogSink = {
    handle(rec: LogRecord) {
        // Ensure stable order: time, level, category, msg, err, meta
        const payload: Record<string, unknown> = {};
        payload.time = rec.time;
        payload.level = rec.level;
        if (rec.category) payload.category = rec.category;
        if (rec.msg) payload.msg = rec.msg;
        if (rec.err) payload.err = rec.err;
        if (rec.meta) payload.meta = rec.meta;
        process.stdout.write(JSON.stringify(payload) + "\n");
    }
};