/**
 * @module @kb-labs/core-sys/logging/console-wrapper
 * Wrapper for direct console.* calls with --quiet flag support
 */

import type { LogLevel } from "./types/types";

/**
 * Check if quiet mode is enabled
 */
function isQuiet(): boolean {
  return process.env.KB_QUIET === 'true' || process.env.KB_QUIET === '1';
}

/**
 * Get current log level from environment or default to 'info'
 * Note: This is a simplified version that reads from env.
 * For full functionality, use getLogLevel() from the logger module.
 */
function getLogLevelFromEnv(): LogLevel {
  const envLevel = process.env.KB_LOG_LEVEL?.toLowerCase();
  if (envLevel === 'debug' || envLevel === 'trace') {return 'debug';}
  if (envLevel === 'info') {return 'info';}
  if (envLevel === 'warn') {return 'warn';}
  if (envLevel === 'error') {return 'error';}
  return 'info';
}

/**
 * Wrapper for console.log that respects --quiet flag
 */
export const consoleLog = (...args: unknown[]): void => {
  if (!isQuiet()) {
    console.log(...args);
  }
};

/**
 * Wrapper for console.error - always outputs (errors should always be visible)
 */
export const consoleError = (...args: unknown[]): void => {
  console.error(...args);
};

/**
 * Wrapper for console.warn that respects --quiet flag
 */
export const consoleWarn = (...args: unknown[]): void => {
  if (!isQuiet()) {
    console.warn(...args);
  }
};

/**
 * Wrapper for console.debug that respects --quiet flag and log level
 */
export const consoleDebug = (...args: unknown[]): void => {
  if (!isQuiet()) {
    const level = getLogLevelFromEnv();
    // Only output debug if log level is debug or trace
    if (level === 'debug' || level === 'trace') {
      console.debug(...args);
    }
  }
};

/**
 * Get current log level (for external use)
 * Note: This reads from env. For accurate level, use getLogLevel() from logger module.
 */
export function getCurrentLogLevel(): LogLevel {
  return getLogLevelFromEnv();
}
