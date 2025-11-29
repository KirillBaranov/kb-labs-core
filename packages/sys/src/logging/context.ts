/**
 * @module @kb-labs/core-sys/logging/context
 * Logging context for trace/span IDs and request tracking
 */

export interface LogContext {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  executionId?: string;
  requestId?: string;
  /** Tenant identifier (multi-tenancy support) */
  tenantId?: string;
  /** Tenant tier (multi-tenancy support) */
  tier?: string;
}

let currentContext: LogContext | undefined;

/**
 * Set current logging context
 */
export function setLogContext(context: LogContext): void {
  currentContext = { ...context };
}

/**
 * Get current logging context
 */
export function getLogContext(): LogContext | undefined {
  return currentContext ? { ...currentContext } : undefined;
}

/**
 * Clear current logging context
 */
export function clearLogContext(): void {
  currentContext = undefined;
}

/**
 * Execute function with temporary logging context
 */
export function withLogContext<T>(context: LogContext, fn: () => T): T {
  const previous = currentContext;
  try {
    setLogContext(context);
    return fn();
  } finally {
    if (previous) {
      currentContext = previous;
    } else {
      clearLogContext();
    }
  }
}

/**
 * Merge additional context into current context
 */
export function mergeLogContext(additional: Partial<LogContext>): void {
  if (currentContext) {
    currentContext = { ...currentContext, ...additional };
  } else {
    currentContext = { ...additional };
  }
}

/**
 * Set tenant context for logging
 * Helper for multi-tenancy support
 *
 * @param tenantId - Tenant identifier
 * @param tier - Tenant tier (optional)
 */
export function setTenantContext(tenantId: string, tier?: string): void {
  mergeLogContext({ tenantId, tier });
}



