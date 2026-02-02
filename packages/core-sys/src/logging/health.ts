/**
 * @module @kb-labs/core-sys/logging/health
 * Health checks for logging system and sinks
 */

import { getMetrics, getAllSinkHealth, getSinkHealth, type SinkHealth } from "./metrics";
import type { LogSink } from "./types/types";

/**
 * Overall logging system health
 */
export interface LoggingHealth {
    /** Is logging system healthy */
    ok: boolean;
    /** Overall status message */
    message: string;
    /** Metrics summary */
    metrics: {
        logsWritten: number;
        logsDropped: number;
        sinkFailures: number;
        unhealthySinks: number;
    };
    /** Individual sink health statuses */
    sinks: SinkHealth[];
}

/**
 * Check health of all sinks
 */
export async function checkSinkHealth(sink: LogSink): Promise<{ ok: boolean; error?: string }> {
    const sinkId = sink.id || 'unknown';
    
    // If sink has health check function, use it
    if (sink.health) {
        try {
            return await Promise.resolve(sink.health());
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    
    // Otherwise check metrics-based health
    const health = getSinkHealth(sinkId);
    if (health) {
        return {
            ok: health.ok,
            error: health.error,
        };
    }
    
    // No health info available - assume healthy
    return { ok: true };
}

/**
 * Check overall logging system health
 */
export async function checkLoggingHealth(): Promise<LoggingHealth> {
    const metrics = getMetrics();
    const sinkHealths = getAllSinkHealth();
    
    const unhealthySinks = sinkHealths.filter(s => !s.ok);
    const ok = unhealthySinks.length === 0 && metrics.sinkFailures < 1000; // Threshold for failures
    
    return {
        ok,
        message: ok
            ? `Logging system healthy. ${metrics.logsWritten} logs written, ${metrics.logsDropped} dropped.`
            : `Logging system unhealthy. ${unhealthySinks.length} unhealthy sinks, ${metrics.sinkFailures} failures.`,
        metrics: {
            logsWritten: metrics.logsWritten,
            logsDropped: metrics.logsDropped,
            sinkFailures: metrics.sinkFailures,
            unhealthySinks: unhealthySinks.length,
        },
        sinks: sinkHealths,
    };
}

/**
 * Check health of specific sink by ID
 */
export function getSinkHealthStatus(sinkId: string): SinkHealth | undefined {
    return getSinkHealth(sinkId);
}

