/**
 * @module @kb-labs/core-platform/adapters
 * Platform adapter interfaces (replaceable implementations).
 */

// Adapter Manifest
export type {
  AdapterManifest,
  AdapterType,
  AdapterDependency,
  AdapterExtension,
  AdapterCapabilities,
  AdapterFactory,
} from './adapter-manifest.js';

// Analytics
export type {
  IAnalytics,
  AnalyticsContext,
  AnalyticsEvent,
  EventsQuery,
  EventsResponse,
  EventsStats,
  BufferStatus,
  DlqStatus,
  DailyStats,
} from './analytics.js';

// Vector Store
export type {
  IVectorStore,
  VectorRecord,
  VectorSearchResult,
  VectorFilter,
} from './vector-store.js';

// LLM
export type { ILLM, LLMOptions, LLMResponse } from './llm.js';

// Embeddings
export type { IEmbeddings } from './embeddings.js';

// Cache
export type { ICache } from './cache.js';

// Config
export type { IConfig } from './config.js';

// Storage
export type { IStorage, StorageMetadata } from './storage.js';

// Database
export type {
  // SQL
  ISQLDatabase,
  SQLQueryResult,
  SQLTransaction,
  // Document
  IDocumentDatabase,
  BaseDocument,
  DocumentFilter,
  DocumentUpdate,
  FilterOperators,
  FindOptions,
  // Key-Value
  IKeyValueDatabase,
  // Time-Series
  ITimeSeriesDatabase,
  TimeSeriesPoint,
  // Provider
  IDatabaseProvider,
} from './database.js';

// Logger
export type { ILogger, ILogBuffer, LogRecord, LogQuery, LogLevel } from './logger.js';
export { generateLogId } from './logger.js';

// Log Ring Buffer
export type { ILogRingBuffer, LogRingBufferConfig } from './log-ring-buffer.js';

// Log Persistence
export type { ILogPersistence, LogPersistenceConfig } from './log-persistence.js';

// Event Bus
export type { IEventBus, EventHandler, Unsubscribe } from './event-bus.js';

// Invoke (inter-plugin calls)
export type { IInvoke, InvokeRequest, InvokeResponse } from './invoke.js';

// Artifacts (plugin outputs)
export type {
  IArtifacts,
  ArtifactMeta,
  ArtifactWriteOptions,
} from './artifacts.js';

// Execution Backend (plugin execution layer)
export type {
  IExecutionBackend,
  ExecutionRequest,
  ExecutionResult,
  ExecuteOptions,
} from './execution.js';
