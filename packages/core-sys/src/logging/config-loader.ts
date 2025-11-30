/**
 * @module @kb-labs/core-sys/logging/config-loader
 * Load logging configuration from kb.config.json
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { configureLogger, type LogSink } from "./index";
import { configureAI } from "./ai-config";
import { initLogging } from "./init";
import { createFileSink } from "./sinks/file-sink";
import { createConsoleSink } from "./sinks/console-sink";
import { jsonSink } from "./sinks/json";
import { createRedactor } from "./redaction";
import { createEnrichmentSink } from "./adapters/enrichment-adapter";
import type { LogLevel, AIConfig } from "./types/types";

export interface LoggingConfig {
  level?: string;
  mode?: 'tty' | 'json' | 'auto';
  quiet?: boolean;
  format?: 'human' | 'ai';
  adapters?: AdapterConfig[];
  enrichment?: Record<string, string>;
  redaction?: {
    enabled: boolean;
    keys: string[];
    mask?: string;
  };
  categoryFilter?: {
    enabled: boolean;
    allowList: string[];
  };
  ai?: AIConfig;  // AI configuration
}

export interface AdapterConfig {
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

// Registry адаптеров (встроенные)
const BUILTIN_ADAPTERS: Record<string, (config: any) => LogSink | Promise<LogSink>> = {
  console: (config: any) => {
    const verbosity = config.verbosity || 'normal';
    const mode = config.mode || 'tty';
    const format = config.format || 'human';
    return createConsoleSink({ verbosity, mode, format });
  },
  file: (config: any) => createFileSink(config),
};

// Опциональные адаптеры (lazy load)
async function loadOptionalAdapter(type: string, config: any): Promise<LogSink | null> {
  try {
    switch (type) {
      case 'sentry':
        const sentryModule = await import('./adapters/sentry-adapter');
        return sentryModule.createSentryAdapter(config);
      case 'loki':
        const lokiModule = await import('./adapters/loki-adapter');
        return lokiModule.createLokiAdapter(config);
      case 'elasticsearch':
        const esModule = await import('./adapters/elasticsearch-adapter');
        return esModule.createElasticsearchAdapter(config);
      case 'datadog':
        const datadogModule = await import('./adapters/datadog-adapter');
        return datadogModule.createDatadogAdapter(config);
      default:
        return null;
    }
  } catch (error) {
    console.warn(`[Logging] Failed to load adapter ${type}:`, error);
    return null;
  }
}

/**
 * Load and initialize logging from kb.config.json
 */
export async function initLoggingFromConfig(configPath: string = './kb.config.json'): Promise<void> {
  const resolvedPath = resolve(process.cwd(), configPath);
  
  if (!existsSync(resolvedPath)) {
    throw new Error(`Config file not found: ${resolvedPath}`);
  }
  
  // 1. Загрузить конфиг
  const configContent = await readFile(resolvedPath, 'utf-8');
  const config = JSON.parse(configContent);
  const loggingConfig: LoggingConfig = config.logging || {};
  
  // 2. Подставить переменные окружения
  const resolvedConfig = resolveEnvVars(loggingConfig);
  
  // 3. Configure AI if specified (before creating sinks)
  if (resolvedConfig.ai) {
    configureAI(resolvedConfig.ai);
  }
  
  // 4. Создать sinks из адаптеров
  const sinks: LogSink[] = [];
  
  for (const adapterConfig of resolvedConfig.adapters || []) {
    if (!adapterConfig.enabled) continue;
    
    // Проверить встроенные адаптеры
    const builtinFactory = BUILTIN_ADAPTERS[adapterConfig.type];
    if (builtinFactory) {
      try {
        const sink = await Promise.resolve(builtinFactory(adapterConfig.config));
        sinks.push(sink);
        continue;
      } catch (error) {
        console.error(`[Logging] Failed to create builtin adapter ${adapterConfig.type}:`, error);
        continue;
      }
    }
    
    // Попробовать загрузить опциональный адаптер
    const optionalSink = await loadOptionalAdapter(adapterConfig.type, adapterConfig.config);
    if (optionalSink) {
      sinks.push(optionalSink);
    } else {
      console.warn(`[Logging] Unknown adapter type: ${adapterConfig.type}`);
    }
  }
  
  // Если нет адаптеров, добавить дефолтный console
  if (sinks.length === 0) {
    sinks.push(createConsoleSink({
      verbosity: 'normal',
      mode: resolvedConfig.mode === 'json' ? 'json' : 'tty',
      format: resolvedConfig.format || 'human',
    }));
  }
  
  // 5. Добавить enrichment
  let finalSinks = sinks;
  if (resolvedConfig.enrichment) {
    finalSinks = sinks.map(sink => 
      createEnrichmentSink(sink, resolvedConfig.enrichment!)
    );
  }
  
  // 6. Настроить redaction
  let redactor = undefined;
  if (resolvedConfig.redaction?.enabled) {
    redactor = createRedactor({
      keys: resolvedConfig.redaction.keys,
      mask: resolvedConfig.redaction.mask,
    });
  }
  
  // 7. Настроить фильтрацию по категориям
  let categoryFilter = undefined;
  if (resolvedConfig.categoryFilter?.enabled) {
    categoryFilter = resolvedConfig.categoryFilter.allowList;
  }
  
  // 8. Инициализировать логирование
  initLogging({
    level: (resolvedConfig.level || 'info') as LogLevel,
    mode: resolvedConfig.mode || 'auto',
    quiet: resolvedConfig.quiet || false,
    format: resolvedConfig.format || 'human',
  });
  
  // 9. Настроить sinks и опции
  configureLogger({
    sinks: finalSinks,
    redactor,
    categoryFilter,
  });
}

function resolveEnvVars(config: any): any {
  const resolved = JSON.parse(JSON.stringify(config));
  
  const traverse = (obj: any): void => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Заменить ${VAR_NAME} на значение из process.env
        obj[key] = obj[key].replace(/\$\{([^}]+)\}/g, (_, varName: string) => {
          return process.env[varName] || '';
        });
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key]);
      }
    }
  };
  
  traverse(resolved);
  return resolved;
}


