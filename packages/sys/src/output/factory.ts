/**
 * @module @kb-labs/core-sys/output/factory
 * Output factory with auto-detection
 */

import type { Output, OutputMode, VerbosityLevel, DebugFormat } from "./types.js";
import type { LogSink } from "../logging/types/types.js";
import { createConsoleSink } from "../logging/sinks/console-sink.js";
import { createFileSink } from "../logging/sinks/file-sink.js";
import { OutputImpl } from "./output-impl.js";

export interface OutputConfig {
    verbosity?: VerbosityLevel; // Из флагов
    mode?: OutputMode; // Auto-detect или explicit
    format?: DebugFormat; // 'human' | 'ai'
    json?: boolean; // --json флаг
    sinks?: LogSink[]; // Дополнительные sinks
    category?: string; // Категория для логов
    context?: {
        // Контекст команды
        plugin?: string;
        command?: string;
        trace?: string;
    };
}

export function createOutput(config: OutputConfig = {}): Output {
    // Auto-detect mode
    const mode: OutputMode = config.mode || detectMode();

    // Verbosity из конфига или normal по умолчанию
    const verbosity: VerbosityLevel = config.verbosity || "normal";

    // Format
    const format: DebugFormat =
        config.format || (config.json ? "ai" : "human");

    // Создать sinks
    const sinks: LogSink[] = config.sinks || [];

    // Console sink (всегда активен)
    sinks.push(createConsoleSink({ verbosity, mode, format }));

    // File sink (всегда активен для debug)
    const fileSink = createFileSink({
        path: ".kb/logs/current.jsonl",
        maxSize: "10MB",
        maxAge: "7d",
    });
    sinks.push(fileSink);

    // Создать Output implementation
    return new OutputImpl({
        mode,
        verbosity,
        format,
        json: config.json || false,
        sinks,
        category: config.category,
        context: config.context,
    });
}

function detectMode(): OutputMode {
    // CI environment
    if (process.env.CI === "true") {
        return "ci";
    }

    // TTY
    if (process.stdout.isTTY) {
        return "tty";
    }

    // Pipe
    return "pipe";
}


