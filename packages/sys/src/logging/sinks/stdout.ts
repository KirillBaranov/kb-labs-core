import type { LogRecord, LogSink } from "../types";

export const stdoutSink: LogSink = {
    handle(rec: LogRecord) {
        const line = `[${rec.time}] ${rec.level.toUpperCase()}${rec.category ? ` ${rec.category}` : ""}: ${rec.msg ?? ""}`;
        if (rec.level === "error") {
            if (rec.err) {
                console.error(line, rec.meta ?? {}, rec.err);
            } else {
                console.error(line, rec.meta ?? {});
            }
        } else if (rec.level === "warn") {
            console.warn(line, rec.meta ?? {});
        } else if (rec.level === "info") {
            console.log(line, rec.meta ?? {});
        } else {
            // debug
            console.debug(line, rec.meta ?? {});
        }
    }
};