/**
 * @module @kb-labs/core-sys/logging/adapters/enrichment-adapter
 * Enrichment adapter for adding metadata to all logs
 */

import type { LogSink, LogRecord } from '../types/types.js';

/**
 * Create enrichment sink that adds metadata to all log records
 */
export function createEnrichmentSink(
  targetSink: LogSink,
  metadata: Record<string, unknown>
): LogSink {
  return {
    async handle(rec: LogRecord) {
      const enriched: LogRecord = {
        ...rec,
        meta: {
          ...metadata,
          ...rec.meta,
        },
      };
      
      await targetSink.handle(enriched);
    },
  };
}

