/**
 * @module @kb-labs/core-platform
 * Pure abstractions for KB Labs platform.
 *
 * This package contains ONLY interfaces - no implementations with external dependencies.
 * All implementations are in the noop/ submodule or in separate adapter packages.
 *
 * @example
 * ```typescript
 * // Import adapter interfaces
 * import type { IAnalytics, IVectorStore, ILLM } from '@kb-labs/core-platform';
 *
 * // Import core feature interfaces
 * import type { IWorkflowEngine, IJobScheduler } from '@kb-labs/core-platform';
 *
 * // Import NoOp implementations for testing
 * import { NoOpAnalytics, MemoryCache } from '@kb-labs/core-platform/noop';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER INTERFACES (replaceable implementations via kb.config.json)
// ═══════════════════════════════════════════════════════════════════════════

export type {
  AdapterManifest,
  AdapterType,
  AdapterDependency,
  AdapterExtension,
  AdapterCapabilities,
  AdapterFactory,
} from './adapters/adapter-manifest.js';

export type { IAnalytics } from './adapters/analytics.js';

export type {
  IVectorStore,
  VectorRecord,
  VectorSearchResult,
  VectorFilter,
} from './adapters/vector-store.js';

export type { ILLM, LLMOptions, LLMResponse } from './adapters/llm.js';

// Analytics wrappers
export { AnalyticsLLM } from './wrappers/analytics-llm.js';
export { AnalyticsEmbeddings } from './wrappers/analytics-embeddings.js';
export { AnalyticsVectorStore } from './wrappers/analytics-vector-store.js';
export { AnalyticsCache } from './wrappers/analytics-cache.js';
export { AnalyticsStorage } from './wrappers/analytics-storage.js';
export { ScopedAnalytics, createScopedAnalytics, isScopedAnalytics, unwrapScopedAnalytics } from './wrappers/scoped-analytics.js';

export type { IEmbeddings } from './adapters/embeddings.js';

export type { ICache } from './adapters/cache.js';

export type { IConfig } from './adapters/config.js';

export type { IStorage } from './adapters/storage.js';

export type { ILogger, ILogBuffer, LogRecord, LogQuery, LogLevel } from './adapters/logger.js';

export type {
  ILogPersistence,
  LogPersistenceConfig,
} from './adapters/log-persistence.js';

// Logging utilities
export { createPrefixedLogger, SYSTEM_LOG_FIELDS } from './logging/prefixed-logger.js';

// Log reader adapter (read-only interface for querying logs)
export type {
  ILogReader,
  LogQueryOptions,
  LogQueryResult,
  LogSearchOptions,
  LogSearchResult,
  LogStats,
  LogCapabilities,
} from './adapters/log-reader.js';

export type {
  IEventBus,
  EventHandler,
  Unsubscribe,
} from './adapters/event-bus.js';

export type {
  IInvoke,
  InvokeRequest,
  InvokeResponse,
} from './adapters/invoke.js';

// Learning / feedback stores
export type {
  IHistoryStore,
  HistoryRecord,
  HistoryFindOptions,
} from './learning/history-store.js';

export type {
  IFeedbackStore,
  FeedbackRecord,
  FeedbackType,
} from './learning/feedback-store.js';

export { MemoryHistoryStore } from './learning/memory-history-store.js';
export { MemoryFeedbackStore } from './learning/memory-feedback-store.js';
export { FileHistoryStore, type FileHistoryStoreOptions } from './learning/file-history-store.js';
export { FileFeedbackStore, type FileFeedbackStoreOptions } from './learning/file-feedback-store.js';

export type {
  IArtifacts,
  ArtifactMeta,
  ArtifactWriteOptions,
} from './adapters/artifacts.js';

export type {
  IExecutionBackend,
  ExecutionRequest,
  ExecutionResult,
  ExecuteOptions,
} from './adapters/execution.js';

// ═══════════════════════════════════════════════════════════════════════════
// CORE FEATURE INTERFACES (built-in, not replaceable)
// ═══════════════════════════════════════════════════════════════════════════

export type {
  IWorkflowEngine,
  WorkflowOptions,
  WorkflowRun,
  WorkflowStepRun,
  WorkflowFilter,
  RetryPolicy,
} from './core/workflow.js';

export type {
  IJobScheduler,
  JobDefinition,
  JobHandle,
  JobStatus,
  JobFilter,
  CronExpression,
} from './core/jobs.js';

export type {
  ICronManager,
  CronJob,
  CronContext,
  CronHandler,
} from './core/cron.js';

export type {
  IResourceManager,
  ResourceType,
  ResourceSlot,
  ResourceAvailability,
  TenantQuotas,
} from './core/resources.js';
export type { IPlatformAdapters } from './platform-adapters.js';
