/**
 * @module @kb-labs/core-platform/adapters
 * Platform adapter interfaces (replaceable implementations).
 */

// Analytics
export type { IAnalytics } from './analytics.js';

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

// Storage
export type { IStorage } from './storage.js';

// Logger
export type { ILogger } from './logger.js';

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
