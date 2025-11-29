/**
 * @module @kb-labs/core-sys/logging/noop-logger
 * No-op logger for contexts where logging is not available or not needed
 */

import type { Logger } from "./types/types.js";

/**
 * Create a no-op logger that silently ignores all log calls
 * Useful for modules that accept optional logger parameter
 */
export function createNoOpLogger(): Logger {
    const noop = () => {};

    return {
        debug: noop,
        info: noop,
        warn: noop,
        error: noop,
        child: () => createNoOpLogger(),
    };
}
