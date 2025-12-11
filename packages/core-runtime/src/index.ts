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

// Transport utilities
export { BulkTransferHelper } from './transport/bulk-transfer.js';
export type { BulkTransfer, BulkTransferOptions } from './transport/bulk-transfer.js';

// Transport layer for IPC adapter communication
export type { ITransport, TransportConfig, PendingRequest } from './transport/transport.js';
export {
  TransportError,
  TimeoutError,
  CircuitOpenError,
  isRetryableError,
} from './transport/transport.js';
export { IPCTransport, createIPCTransport } from './transport/ipc-transport.js';
export { UnixSocketTransport, createUnixSocketTransport } from './transport/unix-socket-transport.js';
export type { UnixSocketConfig } from './transport/unix-socket-transport.js';
export { selectTimeout, getOperationTimeout, OPERATION_TIMEOUTS } from './transport/timeout-config.js';

// IPC Server (parent process)
export { IPCServer, createIPCServer } from './ipc/ipc-server.js';

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
