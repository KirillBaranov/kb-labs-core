/**
 * @module @kb-labs/core-sys/logging/adapters/loki-adapter
 * Loki adapter for log aggregation
 */

import type { LogSink, LogRecord, LogLevel } from '../types/types.js';

interface LokiAdapterConfig {
  url: string;
  batchSize?: number;
  flushInterval?: number;
  labels?: Record<string, string>;
  sampleRate?: Partial<Record<LogLevel, number>>;
}

/**
 * Create Loki adapter sink with batching and sampling
 */
export async function createLokiAdapter(config: LokiAdapterConfig): Promise<LogSink> {
  if (!config.url) {
    throw new Error('Loki URL is required');
  }
  
  const batch: LogRecord[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  
  const maxBatchSize = config.batchSize || 100;
  const flushIntervalMs = config.flushInterval || 5000;
  const labels = config.labels || {};
  const sampleRate = config.sampleRate || {};
  
  async function flush(): Promise<void> {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    
    if (batch.length === 0) return;
    
    const toSend = [...batch];
    batch.length = 0;
    
    try {
      const response = await fetch(`${config.url}/loki/api/v1/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streams: toSend.map(rec => ({
            stream: {
              level: rec.level,
              category: rec.category || 'default',
              ...labels,
            },
            values: [[
              `${Date.now()}000000`, // Nanosecond timestamp для Loki
              JSON.stringify({
                msg: rec.msg,
                ...rec.meta,
                err: rec.err,
              }),
            ]],
          })),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Loki push failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[LokiAdapter] Failed to send batch:', error);
      // Вернуть логи в буфер для retry (ограничить размер)
      if (batch.length + toSend.length < maxBatchSize * 2) {
        batch.unshift(...toSend.slice(0, maxBatchSize));
      }
    }
  }
  
  return {
    async handle(rec: LogRecord) {
      // Sampling
      const rate = sampleRate[rec.level] ?? 1.0;
      if (rate > 0 && Math.random() > rate) {
        return;
      }
      
      batch.push(rec);
      
      if (batch.length >= maxBatchSize) {
        await flush();
      } else if (!flushTimer) {
        flushTimer = setTimeout(() => {
          void flush();
        }, flushIntervalMs);
      }
    },
  };
}

