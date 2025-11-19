/**
 * @module @kb-labs/core-sys/output/output-impl
 * Output implementation
 */

import type {
    Output,
    OutputMode,
    VerbosityLevel,
    DebugFormat,
    ErrorOptions,
    ProgressDetails,
    UIUtilities,
    Spinner,
} from "./types.js";
import type { LogSink, LogRecord } from "../logging/types/types.js";
import {
    box,
    keyValue,
    table,
    createSpinner,
    safeColors,
    safeSymbols,
} from "@kb-labs/shared-cli-ui";
import { formatTable } from "@kb-labs/shared-cli-ui/table";

export class OutputImpl implements Output {
    constructor(
        private config: {
            mode: OutputMode;
            verbosity: VerbosityLevel;
            format: DebugFormat;
            json: boolean;
            sinks: LogSink[];
            category?: string;
            context?: Record<string, unknown>;
        }
    ) {}

    // Getters
    get mode(): OutputMode {
        return this.config.mode;
    }

    get verbosity(): VerbosityLevel {
        return this.config.verbosity;
    }

    get isQuiet(): boolean {
        return this.config.verbosity === "quiet";
    }

    get isVerbose(): boolean {
        return ["verbose", "debug", "inspect"].includes(this.config.verbosity);
    }

    get isDebug(): boolean {
        return ["debug", "inspect"].includes(this.config.verbosity);
    }

    get isJSON(): boolean {
        return this.config.json;
    }

    get isAIFormat(): boolean {
        return this.config.format === "ai";
    }

    get ui(): UIUtilities {
        return {
            box,
            table: (rows, headers) => {
                if (headers && headers.length > 0) {
                    return formatTable(
                        headers.map((h) => ({
                            header: h,
                            width: undefined,
                            align: "left" as const,
                        })),
                        rows.map((r) => r.map(String)),
                        { header: true }
                    );
                }
                return table(rows.map((r) => r.map(String)));
            },
            keyValue,
            spinner: (text: string, jsonMode?: boolean) =>
                createSpinner(text, jsonMode || this.isJSON),
            colors: {
                info: safeColors.info,
                warn: safeColors.warn,
                error: safeColors.error,
                success: safeColors.success,
                muted: safeColors.muted,
                bold: safeColors.bold,
                primary: safeColors.primary,
                accent: safeColors.accent,
            },
            symbols: {
                success: safeSymbols.success,
                error: safeSymbols.error,
                warning: safeSymbols.warning,
                info: safeSymbols.info,
                bullet: safeSymbols.bullet,
            },
        };
    }

    // Main methods
    success(message: string, data?: Record<string, unknown>): void {
        if (this.isJSON) {
            this.json({ ok: true, message, ...data });
            return;
        }

        if (this.isQuiet) return;

        const output = `${safeSymbols.success} ${message}`;
        console.log(safeColors.success(output));
        this.log("info", message, data);
    }

    error(error: Error | string, options?: ErrorOptions): void {
        const message = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : undefined;

        if (this.isJSON) {
            this.json({
                ok: false,
                error: {
                    message,
                    code: options?.code,
                    context: options?.context,
                    suggestions: options?.suggestions,
                },
            });
            return;
        }

        // Красивое форматирование ошибки
        const lines: string[] = [];

        if (options?.title) {
            lines.push(
                safeColors.error(`${safeSymbols.error} ${options.title}`)
            );
        }

        lines.push(safeColors.error(message));

        if (options?.code) {
            lines.push(safeColors.muted(`Code: ${options.code}`));
        }

        if (options?.context && Object.keys(options.context).length > 0) {
            lines.push("");
            lines.push(safeColors.bold("Context:"));
            lines.push(
                ...keyValue(
                    Object.fromEntries(
                        Object.entries(options.context).map(([k, v]) => [
                            k,
                            String(v),
                        ])
                    )
                )
            );
        }

        if (options?.suggestions && options.suggestions.length > 0) {
            lines.push("");
            lines.push(safeColors.bold("Suggestions:"));
            options.suggestions.forEach((s) => {
                lines.push(`  ${safeSymbols.bullet} ${s}`);
            });
        }

        if (options?.docs) {
            lines.push("");
            lines.push(safeColors.info(`Documentation: ${options.docs}`));
        }

        const boxed = box("Error", lines);
        console.error(boxed);

        // Логировать в файл
        this.log("error", message, {
            code: options?.code,
            context: options?.context,
            stack,
        });
    }

    warn(message: string, hint?: string): void {
        if (this.isQuiet) return;

        const output = `${safeSymbols.warning} ${message}`;
        console.warn(safeColors.warn(output));

        if (hint) {
            console.warn(safeColors.muted(`  ${hint}`));
        }

        this.log("warn", message, { hint });
    }

    progress(stage: string, details?: ProgressDetails): void {
        if (this.isQuiet) return;

        let output = stage;
        if (details?.current !== undefined && details?.total !== undefined) {
            const percent = Math.round(
                (details.current / details.total) * 100
            );
            output += ` (${details.current}/${details.total}, ${percent}%)`;
        }

        if (details?.message) {
            output += ` - ${details.message}`;
        }

        console.log(safeColors.info(output));
        this.log("info", output, details);
    }

    spinner(text: string): Spinner {
        return createSpinner(text, this.isJSON || this.isQuiet);
    }

    info(message: string, meta?: Record<string, unknown>): void {
        if (!this.isVerbose) return;

        console.log(message);
        this.log("info", message, meta);
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        if (!this.isDebug) return;

        console.log(safeColors.muted(message));
        this.log("debug", message, meta);
    }

    trace(message: string, meta?: Record<string, unknown>): void {
        if (this.verbosity !== "inspect") return;

        console.log(safeColors.muted(`[TRACE] ${message}`));
        this.log("trace", message, meta);
    }

    json(data: unknown): void {
        console.log(JSON.stringify(data, null, 2));
    }

    write(text: string): void {
        if (this.isQuiet) return;
        console.log(text);
    }

    group(name: string): void {
        if (this.isDebug) {
            console.group(name);
        }
    }

    groupEnd(): void {
        if (this.isDebug) {
            console.groupEnd();
        }
    }

    // Internal method
    private log(
        level: LogRecord["level"],
        msg: string,
        meta?: Record<string, unknown>
    ): void {
        const record: LogRecord = {
            time: new Date().toISOString(),
            ts: new Date().toISOString(),
            level,
            category: this.config.category,
            msg,
            meta: { ...this.config.context, ...meta },
        };

        // Отправить во все sinks
        for (const sink of this.config.sinks) {
            try {
                void sink.handle(record);
            } catch (err) {
                // Sink failures should not break execution
                console.error("Sink error:", err);
            }
        }
    }
}

