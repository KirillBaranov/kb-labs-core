/**
 * @module @kb-labs/core-sys/logging/metrics
 * Logging metrics and statistics
 * 
 * Архитектура метрик:
 * - Локальное хранение в памяти (globalThis) для быстрого доступа
 * - Используется для health checks и диагностики
 * - Опциональный экспорт в analytics-sdk для централизованного мониторинга
 * 
 * Почему локально, а не через analytics-sdk напрямую:
 * 1. Метрики нужны для диагностики самой системы логирования
 * 2. Если логирование сломано, как отправить метрики через analytics?
 * 3. Health checks должны работать мгновенно без задержек
 * 4. Избегаем циклических зависимостей (логирование → analytics → логирование)
 * 
 * Экспорт в analytics-sdk опционален и может быть вызван периодически.
 */

import type { LogLevel } from "./types/types";

/**
 * Logging metrics interface
 */
export interface LoggingMetrics {
    /** Total logs written (all levels) */
    logsWritten: number;
    /** Total logs dropped (filtered out) */
    logsDropped: number;
    /** Logs written by level */
    logsByLevel: Record<LogLevel, number>;
    /** Sink failures count */
    sinkFailures: number;
    /** Rotation count (for file sinks) */
    rotationCount: number;
    /** Last reset timestamp */
    lastReset: Date;
}

/**
 * Sink health status
 */
export interface SinkHealth {
    /** Sink identifier */
    id: string;
    /** Is sink healthy */
    ok: boolean;
    /** Error message if unhealthy */
    error?: string;
    /** Last successful write timestamp */
    lastSuccess?: Date;
    /** Last failure timestamp */
    lastFailure?: Date;
    /** Failure count */
    failureCount: number;
}

/**
 * Global metrics state
 */
interface MetricsState {
    logsWritten: number;
    logsDropped: number;
    logsByLevel: Record<LogLevel, number>;
    sinkFailures: number;
    rotationCount: number;
    lastReset: Date;
    sinkHealth: Map<string, SinkHealth>;
}

const METRICS_STORAGE_KEY = Symbol.for('@kb-labs/core-sys/logging/metrics');

function getMetricsState(): MetricsState {
    const global = globalThis as typeof globalThis & { [METRICS_STORAGE_KEY]?: MetricsState };
    if (!global[METRICS_STORAGE_KEY]) {
        global[METRICS_STORAGE_KEY] = {
            logsWritten: 0,
            logsDropped: 0,
            logsByLevel: { trace: 0, debug: 0, info: 0, warn: 0, error: 0, silent: 0 },
            sinkFailures: 0,
            rotationCount: 0,
            lastReset: new Date(),
            sinkHealth: new Map(),
        };
    }
    return global[METRICS_STORAGE_KEY];
}

/**
 * Record a log write
 */
export function recordLogWritten(level: LogLevel): void {
    const state = getMetricsState();
    state.logsWritten++;
    state.logsByLevel[level] = (state.logsByLevel[level] || 0) + 1;
}

/**
 * Record a dropped log (filtered out)
 */
export function recordLogDropped(): void {
    const state = getMetricsState();
    state.logsDropped++;
}

/**
 * Record a sink failure
 */
export function recordSinkFailure(sinkId: string, error: Error | string): void {
    const state = getMetricsState();
    state.sinkFailures++;
    
    const health = state.sinkHealth.get(sinkId) || {
        id: sinkId,
        ok: true,
        failureCount: 0,
    };
    
    health.ok = false;
    health.error = error instanceof Error ? error.message : error;
    health.lastFailure = new Date();
    health.failureCount++;
    
    state.sinkHealth.set(sinkId, health);
}

/**
 * Record a sink success
 */
export function recordSinkSuccess(sinkId: string): void {
    const state = getMetricsState();
    
    const health = state.sinkHealth.get(sinkId) || {
        id: sinkId,
        ok: true,
        failureCount: 0,
    };
    
    health.ok = true;
    health.lastSuccess = new Date();
    health.error = undefined;
    
    state.sinkHealth.set(sinkId, health);
}

/**
 * Record file rotation
 */
export function recordRotation(): void {
    const state = getMetricsState();
    state.rotationCount++;
}

/**
 * Get current metrics
 */
export function getMetrics(): LoggingMetrics {
    const state = getMetricsState();
    return {
        logsWritten: state.logsWritten,
        logsDropped: state.logsDropped,
        logsByLevel: { ...state.logsByLevel },
        sinkFailures: state.sinkFailures,
        rotationCount: state.rotationCount,
        lastReset: state.lastReset,
    };
}

/**
 * Get sink health status
 */
export function getSinkHealth(sinkId: string): SinkHealth | undefined {
    const state = getMetricsState();
    return state.sinkHealth.get(sinkId);
}

/**
 * Get all sink health statuses
 */
export function getAllSinkHealth(): SinkHealth[] {
    const state = getMetricsState();
    return Array.from(state.sinkHealth.values());
}

/**
 * Reset metrics
 */
export function resetMetrics(): void {
    const state = getMetricsState();
    state.logsWritten = 0;
    state.logsDropped = 0;
    state.logsByLevel = { trace: 0, debug: 0, info: 0, warn: 0, error: 0, silent: 0 };
    state.sinkFailures = 0;
    state.rotationCount = 0;
    state.lastReset = new Date();
    state.sinkHealth.clear();
}

