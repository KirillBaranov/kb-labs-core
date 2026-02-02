/**
 * @module @kb-labs/core-sys/logging/metrics-exporter
 * Optional export of logging metrics to analytics system
 * 
 * Экспорт метрик в analytics-sdk опционален и не влияет на работу логирования.
 * Метрики хранятся локально и доступны через getMetrics() независимо от экспорта.
 */

import { getMetrics, getAllSinkHealth } from "./metrics";

/**
 * Telemetry emitter interface (compatible with @kb-labs/core-types)
 */
export interface TelemetryEmitter {
    emit(event: {
        type: string;
        payload: Record<string, unknown>;
        timestamp?: string;
    }): Promise<{ queued: boolean; reason?: string }> | { queued: boolean; reason?: string };
}

/**
 * Export logging metrics to analytics system
 * 
 * Опциональная функция для отправки метрик в централизованную систему мониторинга.
 * Не влияет на работу логирования - метрики всегда доступны локально через getMetrics().
 * 
 * @param emitter - Telemetry emitter (optional, if not provided, export is skipped)
 * @param resetAfterExport - Reset metrics after export (default: false)
 */
export async function exportMetricsToAnalytics(
    emitter?: TelemetryEmitter,
    resetAfterExport = false
): Promise<void> {
    if (!emitter) {
        // Экспорт опционален - если emitter не предоставлен, просто пропускаем
        return;
    }

    try {
        const metrics = getMetrics();
        const sinkHealths = getAllSinkHealth();

        // Отправить метрики логирования
        await emitter.emit({
            type: 'logging.metrics',
            payload: {
                logsWritten: metrics.logsWritten,
                logsDropped: metrics.logsDropped,
                logsByLevel: metrics.logsByLevel,
                sinkFailures: metrics.sinkFailures,
                rotationCount: metrics.rotationCount,
                unhealthySinks: sinkHealths.filter(s => !s.ok).length,
                lastReset: metrics.lastReset.toISOString(),
            },
            timestamp: new Date().toISOString(),
        });

        // Отправить health status каждого sink
        for (const health of sinkHealths) {
            await emitter.emit({
                type: 'logging.sink.health',
                payload: {
                    sinkId: health.id,
                    ok: health.ok,
                    error: health.error,
                    failureCount: health.failureCount,
                    lastSuccess: health.lastSuccess?.toISOString(),
                    lastFailure: health.lastFailure?.toISOString(),
                },
                timestamp: new Date().toISOString(),
            });
        }

        // Опционально сбросить метрики после экспорта
        if (resetAfterExport) {
            const { resetMetrics } = await import('./metrics');
            resetMetrics();
        }
    } catch (error) {
        // Не бросаем ошибку - экспорт не должен влиять на работу логирования
        // Можно залогировать, но только через console чтобы не создавать цикл
        if (typeof console !== 'undefined' && console.error) {
            console.error('[logging] Failed to export metrics to analytics:', error);
        }
    }
}

/**
 * Create periodic metrics exporter
 * 
 * Экспортирует метрики периодически (например, каждые 60 секунд).
 * 
 * @param emitter - Telemetry emitter
 * @param intervalMs - Export interval in milliseconds (default: 60000)
 * @returns Function to stop periodic export
 */
export function createPeriodicMetricsExporter(
    emitter: TelemetryEmitter,
    intervalMs = 60000
): () => void {
    let intervalId: NodeJS.Timeout | null = null;

    const start = () => {
        if (intervalId) {return;} // Already started

        intervalId = setInterval(() => {
            void exportMetricsToAnalytics(emitter, false); // Don't reset, accumulate
        }, intervalMs);
    };

    const stop = () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };

    start();

    return stop;
}

