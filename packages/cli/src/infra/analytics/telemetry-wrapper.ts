/**
 * @module @kb-labs/core-cli/infra/analytics/telemetry-wrapper
 * Optional analytics wrapper for core-cli commands
 * 
 * This module provides an optional wrapper around analytics-sdk-node,
 * allowing commands to work with or without analytics.
 */

import type { TelemetryEmitter, TelemetryEvent, TelemetryEmitResult } from '@kb-labs/core-types';

/**
 * Analytics run scope function signature (from analytics-sdk-node)
 */
type AnalyticsRunScope = (
  options: {
    runId?: string;
    actor?: { type: string; id: string; name?: string };
    ctx?: { workspace?: string; [key: string]: unknown };
  },
  fn: (emit: (event: Partial<TelemetryEvent>) => Promise<TelemetryEmitResult>) => Promise<unknown>
) => Promise<unknown>;

/**
 * Create an optional runScope function that uses analytics-sdk-node if available
 * 
 * @returns runScope function or null if analytics-sdk-node is not available
 */
export async function createOptionalRunScope(): Promise<AnalyticsRunScope | null> {
  try {
    // Dynamic import to avoid hard dependency
    const analytics = await import('@kb-labs/analytics-sdk-node');
    return analytics.runScope as AnalyticsRunScope;
  } catch {
    // analytics-sdk-node not available - return null
    return null;
  }
}

/**
 * Run a function with optional analytics scope
 * 
 * If analytics is available, wraps execution in runScope.
 * Otherwise, just executes the function directly.
 */
export async function runWithOptionalAnalytics<T>(
  options: {
    actor?: { type: string; id: string; name?: string };
    ctx?: { workspace?: string; [key: string]: unknown };
  },
  fn: (emit: (event: Partial<TelemetryEvent>) => Promise<TelemetryEmitResult>) => Promise<T>
): Promise<T> {
  const runScope = await createOptionalRunScope();
  
  if (runScope) {
    // Analytics available - use runScope
    // Map TelemetryEvent to AnalyticsEventV1 format for runScope
    const wrappedFn = async (emit: (event: any) => Promise<any>): Promise<T> => {
      const telemetryEmit = async (event: Partial<TelemetryEvent>): Promise<TelemetryEmitResult> => {
        const result = await emit(event);
        return {
          queued: result.queued ?? false,
          reason: result.reason,
        };
      };
      return fn(telemetryEmit);
    };
    
    return (await runScope(
      {
        actor: options.actor,
        ctx: options.ctx,
      },
      wrappedFn
    )) as T;
  } else {
    // Analytics not available - create no-op emitter
    const noOpEmit = async (_event: Partial<TelemetryEvent>): Promise<TelemetryEmitResult> => {
      return { queued: false, reason: 'Analytics not available' };
    };
    return fn(noOpEmit);
  }
}

