/**
 * @module @kb-labs/sandbox
 * Universal sandbox isolation for CLI and REST API
 */

// Types
export type {
  HandlerRef,
  ExecutionContext,
  ExecutionResult,
  ExecMetrics,
  TraceSpan,
  SandboxConfig,
} from './types/index.js';

// Runner interface
export type { SandboxRunner } from './runner/sandbox-runner.js';

// Factory
export { createSandboxRunner } from './factory.js';

// Utilities (for advanced use)
export { pickEnv } from './isolation/env-filter.js';
export { RingBuffer } from './monitoring/log-collector.js';
export { collectMetrics } from './monitoring/metrics-collector.js';
export { createTraceSpan } from './monitoring/trace-collector.js';

