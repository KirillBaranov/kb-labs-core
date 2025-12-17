/**
 * @module @kb-labs/core-runtime/container
 * Platform DI container.
 */

import type {
  IAnalytics,
  IVectorStore,
  ILLM,
  IEmbeddings,
  ICache,
  IConfig,
  IStorage,
  ILogger,
  IEventBus,
  IInvoke,
  IArtifacts,
  IWorkflowEngine,
  IJobScheduler,
  ICronManager,
  IResourceManager,
} from '@kb-labs/core-platform';

import type { IResourceBroker } from '@kb-labs/core-resource-broker';

import {
  NoOpAnalytics,
  MemoryVectorStore,
  MockLLM,
  MockEmbeddings,
  MemoryCache,
  NoOpConfig,
  MemoryStorage,
  ConsoleLogger,
  MemoryEventBus,
  NoOpInvoke,
  MemoryArtifacts,
  NoOpWorkflowEngine,
  NoOpJobScheduler,
  NoOpCronManager,
  NoOpResourceManager,
} from '@kb-labs/core-platform/noop';

/**
 * Adapter types map for type-safe setAdapter calls.
 */
export interface AdapterTypes {
  analytics: IAnalytics;
  vectorStore: IVectorStore;
  llm: ILLM;
  embeddings: IEmbeddings;
  cache: ICache;
  config: IConfig;
  storage: IStorage;
  logger: ILogger;
  eventBus: IEventBus;
  invoke: IInvoke;
  artifacts: IArtifacts;
}

/**
 * Platform DI container.
 * Provides access to all platform services through lazy-loaded getters.
 */
export class PlatformContainer {
  private adapters = new Map<string, unknown>();
  private initialized = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // ADAPTERS (replaceable via kb.config.json)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set an adapter instance.
   * @param key - Adapter key
   * @param instance - Adapter instance
   */
  setAdapter<K extends keyof AdapterTypes>(key: K, instance: AdapterTypes[K]): void {
    this.adapters.set(key, instance);
  }

  /**
   * Get an adapter instance.
   * @param key - Adapter key
   */
  getAdapter<K extends keyof AdapterTypes>(key: K): AdapterTypes[K] | undefined {
    return this.adapters.get(key) as AdapterTypes[K] | undefined;
  }

  /**
   * Check if an adapter is explicitly configured (not using fallback).
   * @param key - Adapter key
   */
  hasAdapter<K extends keyof AdapterTypes>(key: K): boolean {
    return this.adapters.has(key);
  }

  /**
   * Check if a service is explicitly configured (not using fallback).
   * @param service - Service name (e.g., 'llm', 'vectorStore', 'workflows')
   * @returns true if service is configured, false if using NoOp/fallback
   */
  isConfigured(service: string): boolean {
    // Check if it's an adapter
    if (this.adapters.has(service)) {
      return true;
    }
    // Check core features
    if (this.initialized) {
      const coreFeatures = ['workflows', 'jobScheduler', 'cron', 'resources', 'jobs'];
      if (coreFeatures.includes(service)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get list of all configured services (adapters + core features).
   * Used for validating plugin platform requirements.
   */
  getConfiguredServices(): Set<string> {
    const services = new Set<string>();

    // Adapters
    for (const key of this.adapters.keys()) {
      services.add(key);
    }

    // Core features (always available after init)
    if (this.initialized) {
      services.add('workflows');
      services.add('jobScheduler');
      services.add('cron');
      services.add('resources');
    }

    // Resource broker (if initialized)
    if (this._resourceBroker) {
      services.add('resourceBroker');
    }

    return services;
  }

  /** Analytics adapter (fallback: NoOpAnalytics) */
  get analytics(): IAnalytics {
    return (this.adapters.get('analytics') as IAnalytics) ?? new NoOpAnalytics();
  }

  /** Vector store adapter (fallback: MemoryVectorStore) */
  get vectorStore(): IVectorStore {
    return (this.adapters.get('vectorStore') as IVectorStore) ?? new MemoryVectorStore();
  }

  /** LLM adapter (fallback: MockLLM) */
  get llm(): ILLM {
    return (this.adapters.get('llm') as ILLM) ?? new MockLLM();
  }

  /** Embeddings adapter (fallback: MockEmbeddings) */
  get embeddings(): IEmbeddings {
    return (this.adapters.get('embeddings') as IEmbeddings) ?? new MockEmbeddings();
  }

  /** Cache adapter (fallback: MemoryCache) */
  get cache(): ICache {
    return (this.adapters.get('cache') as ICache) ?? new MemoryCache();
  }

  /** Config adapter (fallback: NoOpConfig) */
  get config(): IConfig {
    return (this.adapters.get('config') as IConfig) ?? new NoOpConfig();
  }

  /** Storage adapter (fallback: MemoryStorage) */
  get storage(): IStorage {
    return (this.adapters.get('storage') as IStorage) ?? new MemoryStorage();
  }

  /** Logger adapter (fallback: ConsoleLogger) */
  get logger(): ILogger {
    return (this.adapters.get('logger') as ILogger) ?? new ConsoleLogger();
  }

  /** Event bus adapter (fallback: MemoryEventBus) */
  get eventBus(): IEventBus {
    return (this.adapters.get('eventBus') as IEventBus) ?? new MemoryEventBus();
  }

  /** Inter-plugin invocation adapter (fallback: NoOpInvoke) */
  get invoke(): IInvoke {
    return (this.adapters.get('invoke') as IInvoke) ?? new NoOpInvoke();
  }

  /** Artifact storage adapter (fallback: MemoryArtifacts) */
  get artifacts(): IArtifacts {
    return (this.adapters.get('artifacts') as IArtifacts) ?? new MemoryArtifacts();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE FEATURES (built-in, initialized during platform init)
  // ═══════════════════════════════════════════════════════════════════════════

  private _workflows?: IWorkflowEngine;
  private _jobs?: IJobScheduler;
  private _cron?: ICronManager;
  private _resources?: IResourceManager;
  private _resourceBroker?: IResourceBroker;
  private _socketServer?: { getSocketPath(): string };

  /** Workflow engine (throws if not initialized) */
  get workflows(): IWorkflowEngine {
    if (!this._workflows) {
      // Return NoOp if not initialized for graceful degradation
      return new NoOpWorkflowEngine();
    }
    return this._workflows;
  }

  /** Job scheduler (throws if not initialized) */
  get jobs(): IJobScheduler {
    if (!this._jobs) {
      return new NoOpJobScheduler();
    }
    return this._jobs;
  }

  /** Cron manager (throws if not initialized) */
  get cron(): ICronManager {
    if (!this._cron) {
      return new NoOpCronManager();
    }
    return this._cron;
  }

  /** Resource manager (throws if not initialized) */
  get resources(): IResourceManager {
    if (!this._resources) {
      return new NoOpResourceManager();
    }
    return this._resources;
  }

  /**
   * Resource broker for rate limiting, queueing, and retry.
   * @throws Error if not initialized
   */
  get resourceBroker(): IResourceBroker {
    if (!this._resourceBroker) {
      throw new Error('ResourceBroker not initialized. Call initPlatform() first.');
    }
    return this._resourceBroker;
  }

  /**
   * Check if resource broker is initialized.
   */
  get hasResourceBroker(): boolean {
    return this._resourceBroker !== undefined;
  }

  /**
   * Initialize core features.
   * Called internally by initPlatform().
   */
  initCoreFeatures(
    workflows: IWorkflowEngine,
    jobs: IJobScheduler,
    cron: ICronManager,
    resources: IResourceManager
  ): void {
    this._workflows = workflows;
    this._jobs = jobs;
    this._cron = cron;
    this._resources = resources;
    this.initialized = true;
  }

  /**
   * Initialize resource broker.
   * Called internally by initPlatform().
   */
  initResourceBroker(broker: IResourceBroker): void {
    this._resourceBroker = broker;
  }

  /**
   * Initialize Unix socket server.
   * Called internally by initPlatform() in parent process.
   */
  initSocketServer(server: { getSocketPath(): string }): void {
    this._socketServer = server;
  }

  /**
   * Get socket path for IPC communication.
   * Returns undefined if not running in parent process.
   */
  getSocketPath(): string | undefined {
    return this._socketServer?.getSocketPath();
  }

  /**
   * Check if platform is initialized.
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset platform to initial state.
   * Clears all adapters and core features.
   * Used primarily for testing.
   */
  reset(): void {
    this.adapters.clear();
    this._workflows = undefined;
    this._jobs = undefined;
    this._cron = undefined;
    this._resources = undefined;
    this._resourceBroker = undefined;
    this._socketServer = undefined;
    this.initialized = false;
  }
}

/**
 * Cross-realm Symbol for platform singleton.
 *
 * Uses Symbol.for() which creates a GLOBAL symbol that works across:
 * - CJS (require('@kb-labs/core-runtime'))
 * - ESM (import '@kb-labs/core-runtime')
 * - Worker Threads (sandbox workers)
 *
 * Symbol.for() is the standard way to create cross-realm symbols:
 * - React uses Symbol.for('react.element')
 * - Redux uses Symbol.for('redux.observable')
 * - This is NOT a hack - it's official JavaScript API
 *
 * Storage: We use `process` instead of `globalThis` because:
 * - `globalThis` is DIFFERENT between CJS and ESM module realms
 * - `process` is the ONLY object shared across all module types in Node.js
 * - This ensures true singleton behavior across the entire Node.js process
 */
const PLATFORM_SINGLETON_KEY = Symbol.for('kb.platform');

/**
 * Type augmentation for process to track platform singleton.
 * This makes TypeScript aware of our platform storage.
 */
declare global {
  var __KB_PLATFORM_SINGLETON__: PlatformContainer | undefined;
}

// Helper to access the singleton via Symbol.for()
function getPlatformFromProcess(): PlatformContainer | undefined {
  return (process as any)[PLATFORM_SINGLETON_KEY];
}

function setPlatformInProcess(platform: PlatformContainer): void {
  (process as any)[PLATFORM_SINGLETON_KEY] = platform;
}

/**
 * Global platform container singleton.
 *
 * Uses Symbol.for() + process for TRUE cross-realm singleton:
 * - Works across CJS (CLI bin.cjs) and ESM (sandbox workers)
 * - All worker threads share the same process object
 * - Each Docker container gets its own process (correct isolation!)
 *
 * This ensures:
 * ✅ One QdrantVectorStore instance per Node.js process
 * ✅ One Logger instance per Node.js process
 * ✅ One Analytics adapter per Node.js process
 * ✅ All sandbox workers share adapters (resource efficiency)
 * ✅ Docker containers are isolated (security for paranoid mode)
 */
export const platform: PlatformContainer = (() => {
  // Check if singleton already exists
  const existing = getPlatformFromProcess();

  if (existing && typeof existing.setAdapter === 'function' && typeof existing.getAdapter === 'function') {
    return existing;
  }

  // Create new singleton and store in process
  const newPlatform = new PlatformContainer();
  setPlatformInProcess(newPlatform);
  return newPlatform;
})();
