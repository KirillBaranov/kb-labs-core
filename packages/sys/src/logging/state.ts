/**
 * @module @kb-labs/core-sys/logging/state
 * Global logging state management
 */

import type { ConfigureOpts, LogLevel, LogSink, Redactor, AIConfig } from "./types";

const GLOBAL_STORAGE_KEY = Symbol.for('@kb-labs/core-sys/logging');

export interface LoggingState {
    globalLevel: LogLevel;
    sinks: LogSink[];
    redactor: Redactor | null;
    categoryFilter: ConfigureOpts["categoryFilter"];
    clock: () => Date;
    initialized: boolean;
    aiConfig?: AIConfig;  // AI configuration (optional, defaults to mode: 'off')
}

export function getGlobalState(): LoggingState {
    const global = globalThis as typeof globalThis & { [GLOBAL_STORAGE_KEY]?: LoggingState };
    if (!global[GLOBAL_STORAGE_KEY]) {
        global[GLOBAL_STORAGE_KEY] = {
            globalLevel: "info",
            sinks: [],
            redactor: null,
            categoryFilter: undefined,
            clock: () => new Date(),
            initialized: false,
            aiConfig: { mode: 'off' },  // Default: AI disabled
        };
    }
    return global[GLOBAL_STORAGE_KEY];
}

