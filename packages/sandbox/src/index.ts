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
export {
  formatProgressBar,
  formatLiveMetrics,
  formatLogLine,
  colorizeLevel,
  shouldUseColors,
  stripColors,
  Colors,
} from './debug/progress.js';
export type { ProgressBarOptions, LiveMetrics } from './debug/progress.js';
export {
  analyzeInsights,
  formatInsights,
} from './debug/insights.js';
export type { ExecutionInsight, InsightType, InsightSeverity } from './debug/insights.js';
export {
  compareSnapshots,
  findLatestSnapshots,
  formatDiff,
} from './debug/diff-analyzer.js';
export type { ExecutionDiff } from './debug/diff-analyzer.js';
export {
  queryLogs,
  formatLogs,
  parseLogs,
  formatLogEntryHuman,
  formatLogEntryAI,
  formatLogEntryCSV,
} from './debug/log-query.js';
export type { LogQuery, LogEntry, LogLevel } from './debug/log-query.js';
export {
  aggregateMetrics,
  formatMetricsDashboard,
} from './debug/metrics-collector.js';
export type { AggregatedMetrics } from './debug/metrics-collector.js';
export {
  createTimeTravelSession,
  stepForward,
  stepBackward,
  jumpToSnapshot,
  jumpToPhase,
  addBreakpoint,
  removeBreakpoint,
  checkBreakpoint,
  getCurrentSnapshot,
  inspectContext,
  getCurrentLogs,
  formatSessionStatus,
} from './debug/time-travel.js';
export type { TimeTravelSession, TimeTravelSnapshot } from './debug/time-travel.js';

// Pre-flight checks
export { runPreflightChecks } from './validation/preflight.js';
export type { PreflightResult, PreflightCheck } from './validation/preflight.js';

// Output system
export { createSandboxOutput, SandboxOutput } from './output/index.js';
export { SANDBOX_ERROR_CODES } from './errors/error-codes.js';
export type { SandboxErrorCode } from './errors/error-codes.js';

// Utilities (for advanced use)
export { pickEnv } from './isolation/env-filter.js';
export { RingBuffer } from './monitoring/log-collector.js';
export { collectMetrics } from './monitoring/metrics-collector.js';
export { createTraceSpan } from './monitoring/trace-collector.js';
export {
  Profiler,
  formatTimeline,
  exportChromeFormat,
  profileToFlameGraph,
  exportFlameGraphHTML,
  checkPerformanceBudget,
  formatBudgetViolations,
  createDefaultBudget,
} from './monitoring/profiler.js';
export type {
  ProfileData,
  ProfilePhase,
  FlameGraphNode,
  PerformanceBudget,
  BudgetViolation,
} from './monitoring/profiler.js';

