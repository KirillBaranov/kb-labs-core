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
  ResourceBrokerConfig,
  JobsConfig,
  WorkflowsConfig,
} from './config.js';

// Analytics context
export { createAnalyticsContext } from './analytics-context.js';

// Core feature implementations (for direct usage/extension)
export {
  ResourceManager,
  JobScheduler,
  CronManager,
  WorkflowEngine,
} from './core/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// IPC & TRANSPORT (Re-exported from @kb-labs/core-ipc)
// ═══════════════════════════════════════════════════════════════════════════

// IPC Servers (Parent Process Side)
export { UnixSocketServer, type UnixSocketServerConfig, IPCServer, createIPCServer } from '@kb-labs/core-ipc';

// Transport Layer (Child Process Side)
export {
  type ITransport,
  type TransportConfig,
  type PendingRequest,
  TransportError,
  TimeoutError,
  CircuitOpenError,
  isRetryableError,
  IPCTransport,
  createIPCTransport,
  UnixSocketTransport,
  createUnixSocketTransport,
  type UnixSocketConfig,
} from '@kb-labs/core-ipc';

// Bulk Transfer (Large Message Optimization)
export { BulkTransferHelper, type BulkTransfer, type BulkTransferOptions } from '@kb-labs/core-ipc';

// Timeout Configuration
export { selectTimeout, getOperationTimeout, OPERATION_TIMEOUTS } from '@kb-labs/core-ipc';

// Proxy adapters (child process)
export { RemoteAdapter } from './proxy/remote-adapter.js';
export { VectorStoreProxy, createVectorStoreProxy } from './proxy/vector-store-proxy.js';

export type {
  ResourceManagerConfig,
  JobSchedulerConfig,
  JobHandler,
  WorkflowEngineConfig,
  WorkflowDefinition,
  WorkflowStepDefinition,
  WorkflowStepContext,
} from './core/index.js';

// Monitoring helpers
export {
  getMonitoringSnapshot,
  getDegradedStatus,
  type MonitoringSnapshot,
  type MonitoringOptions,
  type DegradedLevel,
  type DegradedStatus,
  type DegradedOptions,
} from './monitoring.js';
