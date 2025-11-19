/**
 * @module @kb-labs/core-sys/logging/adapters/datadog-adapter
 * Datadog adapter for log aggregation
 */

import type { LogSink, LogRecord, LogLevel } from '../types/types.js';

interface DatadogAdapterConfig {
  apiKey: string;
  service?: string;
  costOptimization?: {
    enabled: boolean;
    debugRatio?: number;
    infoRatio?: number;
    alwaysSendErrors?: boolean;
  };
}

/**
 * Create Datadog adapter sink
 * Requires datadog-logs package to be installed
 */
export async function createDatadogAdapter(config: DatadogAdapterConfig): Promise<LogSink> {
  if (!config.apiKey) {
    throw new Error('Datadog API key is required');
  }
  
  // Dynamic import to avoid requiring datadog-logs as a dependency
  let datadogLogs: any;
  try {
    datadogLogs = await import('datadog-logs');
  } catch (error) {
    throw new Error('Datadog adapter requires datadog-logs package. Install it: pnpm add datadog-logs');
  }
  
  const service = config.service || process.env.SERVICE_NAME || 'kb-labs';
  const costOpt = config.costOptimization || { enabled: false };
  
  let debugCounter = 0;
  let infoCounter = 0;
  
  return {
    async handle(rec: LogRecord) {
      // Cost optimization: selective sending
      if (costOpt.enabled) {
        let shouldSend = false;
        
        if (rec.level === 'error' && costOpt.alwaysSendErrors !== false) {
          shouldSend = true;
        } else if (rec.level === 'warn') {
          shouldSend = true; // Все warnings
        } else if (rec.level === 'info') {
          infoCounter++;
          const ratio = costOpt.infoRatio || 0.1;
          shouldSend = infoCounter % Math.floor(1 / ratio) === 0;
        } else if (rec.level === 'debug') {
          debugCounter++;
          const ratio = costOpt.debugRatio || 0.01;
          shouldSend = debugCounter % Math.floor(1 / ratio) === 0;
        }
        
        if (!shouldSend) {
          return;
        }
      }
      
      const level = rec.level === 'warn' ? 'warning' : rec.level;
      
      datadogLogs.logger.log(rec.msg || 'Log message', {
        level,
        service,
        category: rec.category,
        ...rec.meta,
        error: rec.err,
      });
    },
  };
}

