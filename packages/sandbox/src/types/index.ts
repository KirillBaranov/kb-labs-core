/**
 * @module @kb-labs/sandbox/types
 * Public types for sandbox system
 */

/**
 * Handler reference - points to a specific handler function
 */
export interface HandlerRef {
  /** Relative path to handler file (e.g., './rest/review.js') */
  file: string;
  /** Export name (e.g., 'handle', 'run') */
  export: string;
}

/**
 * Execution context - runtime information for handler execution
 */
export interface ExecutionContext {
  /** Unique request identifier */
  requestId: string;
  /** Working directory (root of execution) */
  workdir: string;
  /** Output directory (for artifacts) */
  outdir?: string;
  /** Plugin identifier */
  pluginId?: string;
  /** Plugin version */
  pluginVersion?: string;
  /** User context (optional) */
  user?: {
    id?: string;
  };
  /** Debug mode flag */
  debug?: boolean;
  /** Distributed trace ID */
  traceId?: string;
  /** Current span ID */
  spanId?: string;
  /** Parent span ID */
  parentSpanId?: string;
}

/**
 * Execution metrics
 */
export interface ExecMetrics {
  /** Wall-clock time in milliseconds */
  timeMs: number;
  /** CPU time in milliseconds (user + system) */
  cpuMs?: number;
  /** Memory usage in megabytes (RSS) */
  memMb?: number;
}

/**
 * Trace span for distributed tracing
 */
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime: number;
  attributes?: Record<string, unknown>;
}

/**
 * Execution result
 */
export interface ExecutionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metrics: ExecMetrics;
  /** Plugin logs (only in debug mode) */
  logs?: string[];
  /** Distributed traces */
  traces?: TraceSpan[];
}

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  /** Execution limits */
  execution: {
    timeoutMs: number;
    graceMs: number; // SIGTERM → SIGKILL grace period
    memoryMb: number;
  };
  /** Permissions */
  permissions: {
    env: { allow: string[] };
    filesystem: { allow: string[]; deny: string[]; readOnly: boolean };
    network: { allow: string[]; deny: string[] };
    capabilities: string[];
  };
  /** Monitoring */
  monitoring: {
    collectLogs: boolean;
    collectMetrics: boolean;
    collectTraces: boolean;
    logBufferSizeMb: number;
  };
  /** Runtime mode */
  mode: 'subprocess' | 'inprocess';
  /** Dev mode flag */
  devMode?: boolean;
}

