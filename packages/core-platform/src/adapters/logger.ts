/**
 * @module @kb-labs/core-platform/adapters/logger
 * Logger abstraction for structured logging.
 */

/**
 * Logger adapter interface.
 * Implementations: @kb-labs/core-pino (production), ConsoleLogger (noop)
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
}
