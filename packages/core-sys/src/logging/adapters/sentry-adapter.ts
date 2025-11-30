/**
 * @module @kb-labs/core-sys/logging/adapters/sentry-adapter
 * Sentry adapter for error tracking
 */

import type { LogSink, LogRecord, LogLevel } from '../types/types';

interface SentryAdapterConfig {
  dsn: string;
  environment?: string;
  minLevel?: LogLevel;
  sampleRate?: Partial<Record<LogLevel, number>>;
}

const SENTRY_LEVEL_MAP: Record<LogLevel, string> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
};

function shouldSkipLevel(level: LogLevel, minLevel: LogLevel): boolean {
  const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
  return levels.indexOf(level) < levels.indexOf(minLevel);
}

/**
 * Create Sentry adapter sink
 * Requires @sentry/node package to be installed
 */
export async function createSentryAdapter(config: SentryAdapterConfig): Promise<LogSink> {
  if (!config.dsn) {
    throw new Error('Sentry DSN is required');
  }
  
  // Dynamic import to avoid requiring @sentry/node as a dependency
  let Sentry: any;
  try {
    Sentry = await import('@sentry/node');
  } catch (error) {
    throw new Error('Sentry adapter requires @sentry/node package. Install it: pnpm add @sentry/node');
  }
  
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || process.env.NODE_ENV || 'development',
  });
  
  const minLevel = config.minLevel || 'warn';
  const sampleRate = config.sampleRate || { error: 1.0, warn: 1.0 };
  
  return {
    async handle(rec: LogRecord) {
      // Фильтрация по минимальному уровню
      if (shouldSkipLevel(rec.level, minLevel)) {
        return;
      }
      
      // Sampling
      const rate = sampleRate[rec.level] ?? 0;
      if (rate > 0 && Math.random() > rate) {
        return;
      }
      
      const sentryLevel = SENTRY_LEVEL_MAP[rec.level];
      
      if (rec.level === 'error' && rec.err) {
        Sentry.captureException(new Error(rec.err.message), {
          level: sentryLevel,
          tags: {
            category: rec.category,
          },
          extra: rec.meta,
        });
      } else {
        Sentry.captureMessage(rec.msg || 'Log message', {
          level: sentryLevel,
          tags: {
            category: rec.category,
          },
          extra: rec.meta,
        });
      }
    },
  };
}

