/**
 * @module @kb-labs/core-sys/logging/sinks/output-sink
 * Sink that integrates core logger with Output interface
 */

import type { LogRecord, LogSink } from "../types/types";
import type { Output } from "../../output/types";

/**
 * Sink that forwards logs to Output interface
 * Allows core logger to work with unified Output system
 */
export class OutputSink implements LogSink {
    constructor(private output: Output) {}

    handle(rec: LogRecord): void {
        const level = rec.level;
        const msg = rec.msg || "";
        const meta = rec.meta;

        // Map LogRecord to Output methods
        switch (level) {
            case "error":
                if (rec.err) {
                    const error = new Error(rec.err.message);
                    error.stack = rec.err.stack;
                    error.name = rec.err.name;
                    this.output.error(error, {
                        code: rec.err.code,
                        context: meta,
                    });
                } else {
                    this.output.error(msg, { context: meta });
                }
                break;

            case "warn":
                this.output.warn(msg, meta?.hint as string | undefined);
                break;

            case "info":
                this.output.info(msg, meta);
                break;

            case "debug":
                this.output.debug(msg, meta);
                break;

            case "trace":
                this.output.trace(msg, meta);
                break;
        }
    }
}

/**
 * Create sink that forwards to Output
 */
export function createOutputSink(output: Output): LogSink {
    return new OutputSink(output);
}


