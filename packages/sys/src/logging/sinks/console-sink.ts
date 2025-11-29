/**
 * @module @kb-labs/core-sys/logging/sinks/console-sink
 * Smart console sink with verbosity filtering and formatting
 */

import type { LogRecord, LogSink, LogLevel } from "../types/types.js";
import type { VerbosityLevel, OutputMode, DebugFormat } from "../types/types.js";
import { safeColors, safeSymbols } from "@kb-labs/shared-cli-ui";

export interface ConsoleSinkConfig {
    verbosity: VerbosityLevel;
    mode: OutputMode;
    format: DebugFormat;
}

export class ConsoleSink implements LogSink {
    constructor(private config: ConsoleSinkConfig) {}

    handle(rec: LogRecord): void {
        // Фильтрация по verbosity
        const shouldShow = this.shouldShow(rec);
        if (!shouldShow) {
            return;
        }

        // JSON режим - структурированный вывод
        if (this.config.mode === "json") {
            this.outputJSON(rec);
            return;
        }

        // AI формат - минималистичный
        if (this.config.format === "ai") {
            this.outputAI(rec);
            return;
        }

        // Human формат - красивый
        this.outputHuman(rec);
    }

    private shouldShow(rec: LogRecord): boolean {
        const { verbosity } = this.config;
        const { level } = rec;

        // quiet: только error
        if (verbosity === "quiet") {
            return level === "error";
        }

        // normal: error, warn, info (но не debug/trace)
        if (verbosity === "normal") {
            return ["error", "warn", "info"].includes(level);
        }

        // verbose: показываем debug, но не trace
        if (verbosity === "verbose") {
            return level !== "trace";
        }

        // debug, inspect: показываем ВСЁ включая debug и trace
        if (verbosity === "debug" || verbosity === "inspect") {
            return true;
        }

        return true; // fallback
    }

    private outputJSON(rec: LogRecord): void {
        // Write to stderr (logs should not pollute stdout)
        console.error(JSON.stringify(rec));
    }

    private outputAI(rec: LogRecord): void {
        // Минималистичный формат для LLM - write to stderr
        const parts: string[] = [];

        if (rec.level) parts.push(`[${rec.level.toUpperCase()}]`);
        if (rec.category) parts.push(`[${rec.category}]`);
        if (rec.msg) parts.push(rec.msg);

        console.error(parts.join(" "));

        if (rec.meta && Object.keys(rec.meta).length > 0) {
            console.error(JSON.stringify(rec.meta, null, 2));
        }
    }

    private outputHuman(rec: LogRecord): void {
        const { level, msg, meta, err } = rec;

        // Цвета по уровню
        const colors: Record<LogLevel, (text: string) => string> = {
            trace: safeColors.muted,
            debug: safeColors.muted,
            info: safeColors.info,
            warn: safeColors.warning,
            error: safeColors.error,
            silent: safeColors.muted,  // silent никогда не должен выводиться, но на всякий случай
        };

        const color = colors[level] || safeColors.info;

        // Убираем префиксы типа [BOOTSTRAP], [PkgStrategy] - они идут в category
        // В human формате показываем только важное
        // Write to stderr (logs should not pollute stdout)
        if (msg) {
            // Для debug логов добавляем category если есть
            const prefix = rec.category && (rec.level === 'debug' || rec.level === 'trace')
                ? `${safeColors.muted(`[${rec.category}]`)} `
                : '';
            const output = `${prefix}${color(msg)}`;
            console.error(output);
        }

        // Метаданные в debug режиме
        if (meta && this.config.verbosity === "debug") {
            console.error(safeColors.muted(JSON.stringify(meta, null, 2)));
        }

        // Ошибки всегда показываем
        if (err) {
            console.error(safeColors.error(err.stack || err.message));
        }
    }
}

export function createConsoleSink(config: ConsoleSinkConfig): LogSink {
    return new ConsoleSink(config);
}

