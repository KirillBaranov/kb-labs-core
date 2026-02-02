/**
 * @module @kb-labs/core-sys/output/factory
 * Output factory with auto-detection
 */

import type { Output, OutputMode, VerbosityLevel, DebugFormat } from "./types";
import type { LogSink } from "../logging/types/types";
import { createConsoleSink } from "../logging/sinks/console-sink";
import { getLogger } from "../logging/index";
import { OutputImpl } from "./output-impl";

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

    // Создать sinks только для форматированного вывода пользователю
    const sinks: LogSink[] = config.sinks || [];

    // Console sink для форматированного вывода (UI)
    // FileSink убран - используем глобальную систему логирования
    sinks.push(createConsoleSink({ verbosity, mode, format }));

    // Получить глобальный logger для записи в файлы
    // Output будет использовать его вместо собственного FileSink
    const logger = getLogger(config.category || 'output').child({
        meta: config.context || {},
    });

    // Создать Output implementation
    return new OutputImpl({
        mode,
        verbosity,
        format,
        json: config.json || false,
        sinks, // Только ConsoleSink для UI
        logger, // Глобальный logger для записи в файлы
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


