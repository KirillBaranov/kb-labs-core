/**
 * @module @kb-labs/core-sys/logging/adapters/elasticsearch-adapter
 * Elasticsearch adapter for log aggregation
 */

import type { LogSink, LogRecord } from '../types/types';

interface ElasticsearchAdapterConfig {
  node: string;
  index?: string;
  batchSize?: number;
  flushInterval?: number;
}

/**
 * Create Elasticsearch adapter sink with batching
 * Requires @elastic/elasticsearch package to be installed
 */
export async function createElasticsearchAdapter(config: ElasticsearchAdapterConfig): Promise<LogSink> {
  if (!config.node) {
    throw new Error('Elasticsearch node URL is required');
  }
  
  // Dynamic import to avoid requiring @elastic/elasticsearch as a dependency
  let esClient: any;
  try {
    // @ts-expect-error - @elastic/elasticsearch is an optional peer dependency
    const esModule = await import('@elastic/elasticsearch');
    const { Client } = esModule;
    esClient = new Client({
      node: config.node,
    });
  } catch (error) {
    throw new Error('Elasticsearch adapter requires @elastic/elasticsearch package. Install it: pnpm add @elastic/elasticsearch');
  }
  
  const batch: LogRecord[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  const maxBatchSize = config.batchSize || 50;
  const flushIntervalMs = config.flushInterval || 5000;
  const indexPrefix = config.index || 'logs-kb-labs';
  
  async function flush(): Promise<void> {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    
    if (batch.length === 0) {
      return;
    }
    
    const toSend = [...batch];
    batch.length = 0;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const index = `${indexPrefix}-${today}`;
      
      const body = toSend.flatMap(rec => [
        { index: { _index: index } },
        {
          '@timestamp': rec.time,
          level: rec.level,
          category: rec.category,
          message: rec.msg,
          error: rec.err,
          metadata: rec.meta,
        },
      ]);
      
      await esClient.bulk({ body });
    } catch (error) {
      console.error('[ElasticsearchAdapter] Failed to send batch:', error);
      // Вернуть логи в буфер для retry
      if (batch.length + toSend.length < maxBatchSize * 2) {
        batch.unshift(...toSend.slice(0, maxBatchSize));
      }
    }
  }
  
  return {
    async handle(rec: LogRecord) {
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

