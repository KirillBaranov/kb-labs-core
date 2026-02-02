/**
 * @module @kb-labs/core-sys/logging/init
 * Unified logging initialization for all KB Labs components
 */

import { configureLogger, removeSink, getLogger } from "./index";
import type { LogLevel, VerbosityLevel, OutputMode } from "./types/types";
import { createConsoleSink } from "./sinks/console-sink";
import { jsonSink } from "./sinks/json";
import { setupGracefulShutdown } from "./shutdown";

export interface InitLoggingOptions {
  level?: LogLevel;
  quiet?: boolean;
  debug?: boolean;
  mode?: 'tty' | 'json' | 'auto';
  format?: 'human' | 'ai';
  replaceSinks?: boolean;
}

let initialized = false;
let consoleSinkInstance: ReturnType<typeof createConsoleSink> | null = null;
let gracefulShutdownSetup = false;

/**
 * Initialize logging system with unified configuration
 * Should be called once at application startup
 */
export function initLogging(options: InitLoggingOptions = {}): void {
  const {
    level = 'info',
    quiet = false,
    debug = false,
    mode = 'auto',
    format = 'human',
    replaceSinks = !initialized, // Replace on first init, add after
  } = options;

  // Determine actual log level
  const actualLevel: LogLevel = debug ? 'debug' : level;

  // Determine verbosity from log level and quiet flag
  let verbosity: VerbosityLevel;
  if (quiet) {
    verbosity = 'quiet';
  } else if (debug || actualLevel === 'debug' || actualLevel === 'trace') {
    verbosity = 'debug';
  } else {
    verbosity = 'normal';
  }

  // Determine output mode
  let outputMode: OutputMode;
  if (mode === 'auto') {
    // Auto-detect: json if KB_OUTPUT_MODE=json or stdout is not a TTY
    // BUT: if debug flag is set, prefer human-readable format even if not TTY
    if (debug) {
      // Debug mode: prefer human-readable format for better debugging
      outputMode = process.env.KB_OUTPUT_MODE === 'json' ? 'json' : 'tty';
    } else {
      outputMode = process.env.KB_OUTPUT_MODE === 'json' || !process.stdout.isTTY
        ? 'json'
        : 'tty';
    }
  } else {
    outputMode = mode;
  }

  // Create appropriate sink
  let sink;
  if (outputMode === 'json') {
    // Use JSON sink for structured output
    sink = jsonSink;
  } else {
    // Use console sink for human-readable output
    if (consoleSinkInstance) {
      // Remove old sink if exists
      removeSink(consoleSinkInstance);
    }
    
    consoleSinkInstance = createConsoleSink({
      verbosity,
      mode: outputMode,
      format,
    });
    sink = consoleSinkInstance;
  }

  // Configure logger
  configureLogger({
    level: actualLevel,
    sinks: [sink],
    replaceSinks,
  });

  initialized = true;

  // Setup graceful shutdown on first initialization
  if (!gracefulShutdownSetup) {
    setupGracefulShutdown();
    gracefulShutdownSetup = true;
  }

  // Log initialization details (only if not quiet and debug enabled)
  if (!quiet && (debug || actualLevel === 'debug')) {
    const initLogger = getLogger('logging:init');
    initLogger.debug('Logging initialized', {
      level: actualLevel,
      verbosity,
      mode: outputMode,
      format,
      replaceSinks,
    });
  }

  // Set KB_QUIET env variable for console wrapper
  if (quiet) {
    process.env.KB_QUIET = 'true';
  } else {
    delete process.env.KB_QUIET;
  }
}

/**
 * Reset logging initialization state (useful for tests)
 */
export function resetLogging(): void {
  initialized = false;
  consoleSinkInstance = null;
  process.env.KB_QUIET = undefined;
}

