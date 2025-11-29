/**
 * @module @kb-labs/sandbox/runner/initialization/logging-setup
 * Subprocess logging initialization - ensures KB_LOG_LEVEL from parent is respected
 */

import { initLogging, getLogger } from '@kb-labs/core-sys/logging';
import type { Logger } from '@kb-labs/core-sys/logging';

/**
 * Subprocess logger instance (singleton)
 * Created once during subprocess initialization
 */
let subprocessLogger: Logger | undefined;

/**
 * Flag to prevent re-initialization
 */
let isInitialized = false;

export interface SubprocessLoggingOptions {
  /**
   * Enforce log level - prevent re-initialization with different settings
   * This ensures subprocess respects parent's KB_LOG_LEVEL (security requirement)
   */
  enforceLevel?: boolean;
}

/**
 * Initialize subprocess logging system
 *
 * CRITICAL: This must be called BEFORE any other initialization in bootstrap.ts
 * to ensure logging is configured with parent's KB_LOG_LEVEL before any code runs.
 *
 * Parent-Subprocess Contract:
 * - Parent (bin.ts/CLI bootstrap) sets KB_LOG_LEVEL in environment
 * - Subprocess inherits KB_LOG_LEVEL via process.env
 * - This function reads KB_LOG_LEVEL and initializes logging ONCE
 * - enforceLevel=true prevents re-initialization (parent dictates)
 *
 * @param options - Logging configuration options
 * @returns Object with getSubprocessLogger function
 */
export function initializeSubprocessLogging(options: SubprocessLoggingOptions = {}) {
  // If already initialized and enforceLevel is true, return existing logger
  if (isInitialized && options.enforceLevel) {
    return { getSubprocessLogger: () => subprocessLogger! };
  }

  // Read KB_LOG_LEVEL from parent (inherited via environment)
  const logLevel = (process.env.KB_LOG_LEVEL || 'silent').toLowerCase();
  const isQuiet = process.env.KB_QUIET === 'true';
  const isDebug = logLevel === 'debug';

  // Initialize logging system ONCE with parent's settings
  // This ensures all subsequent getLogger() calls use correct level
  initLogging({
    level: logLevel as any,
    quiet: isQuiet,
    debug: isDebug,
    mode: 'auto',
    replaceSinks: true, // Replace any existing sinks from auto-init
  });

  // Create subprocess logger for internal platform use
  subprocessLogger = getLogger('subprocess');
  isInitialized = true;

  // If enforceLevel is true, any future calls to initializeSubprocessLogging
  // will return the existing logger without re-initializing
  // This ensures subprocess cannot override parent's KB_LOG_LEVEL

  return {
    /**
     * Get subprocess logger instance
     * Safe to call multiple times - returns same instance
     */
    getSubprocessLogger: () => subprocessLogger!,
  };
}
