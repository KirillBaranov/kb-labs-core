/**
 * @module @kb-labs/core-runtime
 * DI Container + Core Features Implementations for KB Labs Platform.
 *
 * @example
 * ```typescript
 * import { initPlatform, platform } from '@kb-labs/core-runtime';
 *
 * // Initialize platform with adapters
 * await initPlatform({
 *   adapters: {
 *     analytics: '@kb-labs/analytics-adapter',
 *     vectorStore: '@kb-labs/mind-qdrant',
 *   },
 * });
 *
 * // Use platform services
 * await platform.analytics.track('event');
 * await platform.vectorStore.search([...]);
 * ```
 */

// Container
export { PlatformContainer, platform } from './container.js';
export type { AdapterTypes } from './container.js';

// Loader
export { initPlatform, resetPlatform } from './loader.js';

// Adapter discovery (for testing/debugging)
export { discoverAdapters, resolveAdapter } from './discover-adapters.js';
export type { DiscoveredAdapter } from './discover-adapters.js';

// Config types
export type {
  PlatformConfig,
  AdaptersConfig,
  CoreFeaturesConfig,
  ResourcesConfig,
  JobsConfig,
  WorkflowsConfig,
} from './config.js';

// Core feature implementations (for direct usage/extension)
export {
  ResourceManager,
  JobScheduler,
  CronManager,
  WorkflowEngine,
} from './core/index.js';

export type {
  ResourceManagerConfig,
  JobSchedulerConfig,
  JobHandler,
  WorkflowEngineConfig,
  WorkflowDefinition,
  WorkflowStepDefinition,
  WorkflowStepContext,
} from './core/index.js';
