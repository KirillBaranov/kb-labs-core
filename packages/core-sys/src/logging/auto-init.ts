/**
 * @module @kb-labs/core-sys/logging/auto-init
 * @deprecated This module is deprecated and will be removed in future versions.
 *
 * Auto-init mechanism has been removed. Use explicit initLogging() in your CLI entry point instead.
 * This ensures logging is configured correctly BEFORE any modules try to use getLogger().
 *
 * Migration: Call initLogging() in bootstrap.ts immediately after parsing CLI arguments.
 * Example:
 *   import { initLogging } from '@kb-labs/core-sys/logging';
 *   initLogging({ level: 'error', mode: 'json', replaceSinks: true });
 */

import { initLogging } from "./init";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

let autoInitialized = false;
let configLoaderPromise: Promise<typeof import('./config-loader') | null> | null = null;

/**
 * Автоматическая инициализация при первом вызове getLogger()
 * Использует разумные дефолты или загружает kb.config.json если есть
 */
export function ensureLoggingInitialized(): void {
  if (autoInitialized) return;
  autoInitialized = true;
  
  // 1. Попробовать найти kb.config.json
  const cwd = process.cwd();
  const configPaths = [
    resolve(cwd, 'kb.config.json'),
    resolve(cwd, `kb.config.${process.env.NODE_ENV || 'development'}.json`),
    resolve(cwd, 'kb.config.production.json'),
    resolve(cwd, 'kb.config.development.json'),
  ];
  
  let configFound = false;
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      // Асинхронная загрузка конфига (не блокируем getLogger)
      if (!configLoaderPromise) {
        configLoaderPromise = import('./config-loader').catch(() => null);
      }
      
      configLoaderPromise.then(module => {
        if (module && 'initLoggingFromConfig' in module && module.initLoggingFromConfig) {
          module.initLoggingFromConfig(configPath).catch((error) => {
            console.warn(`[Logging] Failed to load config from ${configPath}:`, error);
            // Fallback к дефолтам
            initDefaultLogging();
          });
        } else {
          initDefaultLogging();
        }
      }).catch(() => {
        // Если config-loader недоступен, использовать дефолты
        initDefaultLogging();
      });
      
      configFound = true;
      return; // Используем первый найденный конфиг
    }
  }
  
  // 2. Если конфига нет, использовать дефолты
  if (!configFound) {
    initDefaultLogging();
  }
}

function initDefaultLogging(): void {
  const level = (process.env.LOG_LEVEL || process.env.KB_LOG_LEVEL || 'error').toLowerCase() as any;
  const quiet = process.env.KB_QUIET === 'true';

  // Умные дефолты по окружению
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isCI = process.env.CI === 'true';
  const isTTY = typeof process !== 'undefined' && process.stdout && process.stdout.isTTY;

  // Default to 'error' to avoid log spam (users can override with --debug or env vars)
  const defaultLevel = isDevelopment ? 'debug' : 'error';
  const defaultMode = isCI || !isTTY ? 'json' : 'auto';

  initLogging({
    level: level || defaultLevel,
    mode: defaultMode,
    quiet,
  });
}

/**
 * Reset auto-initialization state (useful for tests)
 */
export function resetAutoInit(): void {
  autoInitialized = false;
  configLoaderPromise = null;
}

