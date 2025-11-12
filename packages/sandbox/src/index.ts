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

// Adapter context types
export type {
  BaseHandlerContext,
  CliHandlerContext,
  RestHandlerContext,
  HandlerContext,
  AdapterMetadata,
} from './types/adapter-context.js';
export { isCliContext, isRestContext } from './types/adapter-context.js';

// Adapter registry
export { ADAPTER_TYPES, validateAdapterMetadata } from './types/adapter-registry.js';

// Handler result types
export type {
  HandlerResult,
  HandlerResultObject,
  HandlerMeta,
} from './types/handler-result.js';
export { normalizeHandlerResult } from './types/handler-result.js';

// Lifecycle hooks
export type { LifecycleHooks } from './types/lifecycle-hooks.js';

// Runner interface
export type { SandboxRunner } from './runner/sandbox-runner.js';

// Factory
export { createSandboxRunner } from './factory.js';

// Error handling
export { HandlerErrorCode, normalizeError } from './errors/handler-error.js';
export type { HandlerError } from './errors/handler-error.js';

// IPC Serialization
export { serializeContext } from './runner/ipc-serializer.js';
export type { SerializableContext } from './runner/ipc-serializer.js';

// Cancellation
export { createTimeoutSignal } from './cancellation/abort-controller.js';

// Resource tracking
export { ResourceTracker } from './cleanup/resource-tracker.js';

// Context versioning
export { CURRENT_CONTEXT_VERSION, validateContextVersion } from './versioning/context-version.js';

// Extensions
export { createExtensionRegistry, EXTENSION_NAMES } from './extensions/registry.js';
export type { ExtensionRegistry } from './extensions/registry.js';

// Debug logging
export { createDebugLogger, createLoggerOptionsFromContext } from './debug/logger.js';
export type { DebugLogger, DebugLoggerOptions, DebugFormat, DebugDetailLevel, DebugLogEntry, ExecutionContextWithDebug } from './debug/logger.js';

// Pre-flight checks
export { runPreflightChecks } from './validation/preflight.js';
export type { PreflightResult, PreflightCheck } from './validation/preflight.js';

// Utilities (for advanced use)
export { pickEnv } from './isolation/env-filter.js';
export { RingBuffer } from './monitoring/log-collector.js';
export { collectMetrics } from './monitoring/metrics-collector.js';
export { createTraceSpan } from './monitoring/trace-collector.js';
export { Profiler, formatTimeline, exportChromeFormat } from './monitoring/profiler.js';
export type { ProfileData, ProfilePhase } from './monitoring/profiler.js';

