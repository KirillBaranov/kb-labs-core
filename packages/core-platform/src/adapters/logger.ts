/**
 * @module @kb-labs/core-platform/adapters/logger
 * Logger abstraction for structured logging.
 */

/**
 * Log level enumeration
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured log record
 */
export interface LogRecord {
  /** Timestamp (milliseconds since epoch) */
  timestamp: number;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Structured fields (metadata) */
  fields: Record<string, unknown>;
  /** Source identifier (e.g., 'rest', 'workflow', 'cli') */
  source: string;
}

/**
 * Query filters for log retrieval
 */
export interface LogQuery {
  /** Minimum log level (inclusive) */
  level?: LogLevel;
  /** Filter by source */
  source?: string;
  /** Start timestamp (milliseconds since epoch) */
  startTime?: number;
  /** End timestamp (milliseconds since epoch) */
  endTime?: number;
  /** Maximum number of logs to return */
  limit?: number;
}

/**
 * Log buffer interface for streaming/querying logs
 */
export interface ILogBuffer {
  /**
   * Append log record to buffer
   */
  append(record: LogRecord): void;

  /**
   * Query logs with filters
   */
  query(query?: LogQuery): LogRecord[];

  /**
   * Subscribe to real-time log stream
   * @returns Unsubscribe function
   */
  subscribe(callback: (record: LogRecord) => void): () => void;

  /**
   * Get buffer statistics
   */
  getStats(): {
    total: number;
    bufferSize: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  };
}

/**
 * Logger adapter interface.
 * Implementations: @kb-labs/adapters-pino (production), ConsoleLogger (noop)
 */
export interface ILogger {
  /**
   * Log info message.
   * @param message - Log message
   * @param meta - Optional metadata
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log warning message.
   * @param message - Log message
   * @param meta - Optional metadata
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log error message.
   * @param message - Log message
   * @param error - Optional error object
   * @param meta - Optional metadata
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;

  /**
   * Log debug message.
   * @param message - Log message
   * @param meta - Optional metadata
   */
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log trace message (most verbose).
   * @param message - Log message
   * @param meta - Optional metadata
   */
  trace(message: string, meta?: Record<string, unknown>): void;

  /**
   * Create a child logger with additional context.
   * @param bindings - Context bindings (e.g., { plugin: 'mind', tenant: 'acme' })
   */
  child(bindings: Record<string, unknown>): ILogger;

  /**
   * Get log buffer for streaming/querying (optional feature).
   * Not all logger implementations support buffering.
   * @returns Log buffer if streaming is enabled, undefined otherwise
   */
  getLogBuffer?(): ILogBuffer | undefined;
}
