/**
 * @module @kb-labs/core-platform/noop/adapters/logger
 * Console-based logger implementation.
 */

import type { ILogger } from '../../adapters/logger.js';

/**
 * Simple console logger.
 * Outputs to console.log/warn/error/debug with JSON metadata.
 */
export class ConsoleLogger implements ILogger {
  private bindings: Record<string, unknown>;

  constructor(bindings: Record<string, unknown> = {}) {
    this.bindings = bindings;
  }

  private formatMeta(meta?: Record<string, unknown>): string {
    const combined = { ...this.bindings, ...meta };
    if (Object.keys(combined).length === 0) {
      return '';
    }
    return ' ' + JSON.stringify(combined);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}${this.formatMeta(meta)}`);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}${this.formatMeta(meta)}`);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorMeta = error
      ? { ...meta, error: { message: error.message, stack: error.stack } }
      : meta;
    console.error(`[ERROR] ${message}${this.formatMeta(errorMeta)}`);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`[DEBUG] ${message}${this.formatMeta(meta)}`);
  }

  child(bindings: Record<string, unknown>): ILogger {
    return new ConsoleLogger({ ...this.bindings, ...bindings });
  }
}

/**
 * Silent logger that does nothing.
 * Useful for tests where you want to suppress all logging.
 */
export class NoOpLogger implements ILogger {
  info(_message: string, _meta?: Record<string, unknown>): void {
    // No-op
  }

  warn(_message: string, _meta?: Record<string, unknown>): void {
    // No-op
  }

  error(_message: string, _error?: Error, _meta?: Record<string, unknown>): void {
    // No-op
  }

  debug(_message: string, _meta?: Record<string, unknown>): void {
    // No-op
  }

  child(_bindings: Record<string, unknown>): ILogger {
    return this;
  }
}
