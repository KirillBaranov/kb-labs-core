/**
 * @module @kb-labs/core-platform/noop
 * NoOp and in-memory implementations for all platform abstractions.
 *
 * Use these for:
 * - Testing without external dependencies
 * - Local development
 * - Graceful degradation when adapters aren't configured
 */

// Adapter implementations
export {
  NoOpAnalytics,
  MemoryVectorStore,
  MockLLM,
  MockEmbeddings,
  MemoryCache,
  MemoryStorage,
  ConsoleLogger,
  NoOpLogger,
  MemoryEventBus,
  NoOpEventBus,
  NoOpInvoke,
  MemoryArtifacts,
} from './adapters/index.js';

// Core feature implementations
export {
  NoOpWorkflowEngine,
  NoOpJobScheduler,
  NoOpCronManager,
  NoOpResourceManager,
} from './core/index.js';
