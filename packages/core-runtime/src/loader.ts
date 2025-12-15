/**
 * @module @kb-labs/core-runtime/loader
 * Platform initialization and adapter loading.
 */

import type { AdapterTypes, PlatformContainer } from './container.js';
import type { PlatformConfig, CoreFeaturesConfig, ResourceBrokerConfig } from './config.js';
import { platform } from './container.js';
import { resolveAdapter } from './discover-adapters.js';

import { ResourceManager } from './core/resource-manager.js';
import { JobScheduler } from './core/job-scheduler.js';
import { CronManager } from './core/cron-manager.js';
import { WorkflowEngine } from './core/workflow-engine.js';

import {
  ResourceBroker,
  InMemoryRateLimitBackend,
  StateBrokerRateLimitBackend,
  createQueuedLLM,
  createQueuedEmbeddings,
  createQueuedVectorStore,
  getRateLimitConfig,
} from '@kb-labs/core-resource-broker';
import type { RateLimitBackend, ResourceConfig } from '@kb-labs/core-resource-broker';

/**
 * Adapter factory function type.
 * Adapters should export a createAdapter function.
 */
type AdapterFactory<T> = (config?: unknown) => T | Promise<T>;

/**
 * Load an adapter from a package path.
 * Uses workspace discovery to load from file paths (kb-labs-adapters/*),
 * then falls back to dynamic import for npm-installed adapters.
 *
 * @param adapterPath - Package name (e.g., "@kb-labs/adapters-openai")
 * @param cwd - Workspace root directory
 * @returns Adapter instance or undefined if loading fails
 */
async function loadAdapter<T>(adapterPath: string, cwd: string, options?: unknown): Promise<T | undefined> {
  try {
    // Use resolveAdapter to try workspace discovery first, then npm
    const factory = await resolveAdapter(adapterPath, cwd);

    if (factory) {
      return await factory(options);
    }

    platform.logger.warn('Adapter has no createAdapter or default export', { adapterPath });
    return undefined;
  } catch (error) {
    platform.logger.warn('Failed to load adapter', {
      adapterPath,
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }
}

/**
 * Initialize core features with real implementations.
 */
function initializeCoreFeatures(
  container: PlatformContainer,
  config: CoreFeaturesConfig = {}
): {
  workflows: WorkflowEngine;
  jobs: JobScheduler;
  cron: CronManager;
  resources: ResourceManager;
} {
  // Create core features with proper dependencies
  const resources = new ResourceManager(
    container.cache,
    container.logger,
    config.resources
  );

  const jobs = new JobScheduler(
    resources,
    container.eventBus,
    container.logger,
    config.jobs
  );

  const cron = new CronManager(container.logger);

  const workflows = new WorkflowEngine(
    resources,
    container.storage,
    container.eventBus,
    container.logger,
    config.workflows
  );

  return { workflows, jobs, cron, resources };
}

/**
 * Initialize resource broker with queue and rate limiting.
 * Wraps existing adapters with Queued versions for transparent integration.
 * Plugins use useLLM(), useEmbeddings() as before - they don't know about queuing.
 */
function initializeResourceBroker(
  container: PlatformContainer,
  config: ResourceBrokerConfig = {}
): ResourceBroker {
  // Create backend (distributed or in-memory)
  let backend: RateLimitBackend;

  if (config.distributed) {
    // For distributed mode, we need StateBroker
    // This will be implemented when StateBroker is available
    platform.logger.warn('Distributed ResourceBroker not yet implemented, using InMemory');
    backend = new InMemoryRateLimitBackend();
  } else {
    backend = new InMemoryRateLimitBackend();
  }

  const broker = new ResourceBroker(backend);

  // Register LLM resource and wrap adapter
  if (container.hasAdapter('llm')) {
    const llmConfig = config.llm ?? {};
    const realLLM = container.llm; // Save reference to real adapter

    broker.register('llm', {
      rateLimits: llmConfig.rateLimits ?? 'openai-tier-1',
      maxRetries: llmConfig.maxRetries ?? 3,
      timeout: llmConfig.timeout ?? 60000,
      executor: async (operation: string, args: unknown[]) => {
        if (operation === 'complete') {
          return realLLM.complete(args[0] as string, args[1] as any);
        }
        throw new Error(`Unknown LLM operation: ${operation}`);
      },
    });

    // Replace adapter with Queued version - plugins see same interface
    const queuedLLM = createQueuedLLM(broker, realLLM);
    container.setAdapter('llm', queuedLLM);
    platform.logger.debug('ResourceBroker: LLM adapter wrapped with queue');
  }

  // Register Embeddings resource and wrap adapter
  if (container.hasAdapter('embeddings')) {
    const embeddingsConfig = config.embeddings ?? {};
    const realEmbeddings = container.embeddings; // Save reference to real adapter

    broker.register('embeddings', {
      rateLimits: embeddingsConfig.rateLimits ?? 'openai-tier-1',
      maxRetries: embeddingsConfig.maxRetries ?? 3,
      timeout: embeddingsConfig.timeout ?? 60000,
      executor: async (operation: string, args: unknown[]) => {
        if (operation === 'embed') {
          return realEmbeddings.embed(args[0] as string);
        }
        if (operation === 'embedBatch') {
          return realEmbeddings.embedBatch(args[0] as string[]);
        }
        throw new Error(`Unknown Embeddings operation: ${operation}`);
      },
    });

    // Replace adapter with Queued version - plugins see same interface
    const queuedEmbeddings = createQueuedEmbeddings(broker, realEmbeddings);
    container.setAdapter('embeddings', queuedEmbeddings);
    platform.logger.debug('ResourceBroker: Embeddings adapter wrapped with queue');
  }

  // Register VectorStore resource and wrap adapter
  if (container.hasAdapter('vectorStore')) {
    const vsConfig = config.vectorStore ?? {};
    const realVectorStore = container.vectorStore; // Save reference to real adapter

    broker.register('vectorStore', {
      rateLimits: vsConfig.maxConcurrent ? { maxConcurrentRequests: vsConfig.maxConcurrent } : {},
      maxRetries: vsConfig.maxRetries ?? 3,
      timeout: vsConfig.timeout ?? 30000,
      executor: async (operation: string, args: unknown[]) => {
        switch (operation) {
          case 'search':
            return realVectorStore.search(args[0] as number[], args[1] as number, args[2] as any);
          case 'upsert':
            return realVectorStore.upsert(args[0] as any[]);
          case 'delete':
            return realVectorStore.delete(args[0] as string[]);
          case 'count':
            return realVectorStore.count();
          case 'get':
            return realVectorStore.get?.(args[0] as string[]);
          case 'query':
            return realVectorStore.query?.(args[0] as any);
          default:
            throw new Error(`Unknown VectorStore operation: ${operation}`);
        }
      },
    });

    // Replace adapter with Queued version - plugins see same interface
    const queuedVectorStore = createQueuedVectorStore(broker, realVectorStore);
    container.setAdapter('vectorStore', queuedVectorStore);
    platform.logger.debug('ResourceBroker: VectorStore adapter wrapped with queue');
  }

  return broker;
}

/**
 * Initialize the platform with configuration.
 * Loads adapters and initializes core features.
 *
 * @param config - Platform configuration
 * @param cwd - Workspace root directory (defaults to process.cwd())
 * @returns Initialized platform container
 *
 * @example
 * ```typescript
 * await initPlatform({
 *   adapters: {
 *     analytics: '@kb-labs/analytics-adapter',
 *     vectorStore: '@kb-labs/adapters-qdrant',
 *     llm: '@kb-labs/adapters-openai',
 *   },
 *   core: {
 *     resources: { defaultQuotas: { ... } },
 *     jobs: { maxConcurrent: 10 },
 *   },
 * });
 * ```
 */
export async function initPlatform(
  config: PlatformConfig = {},
  cwd: string = process.cwd()
): Promise<PlatformContainer> {
  // ✅ Idempotent: If already initialized, return existing singleton
  // This prevents duplicate adapter instances across CLI and sandbox processes
  platform.logger.debug(`initPlatform isInitialized=${platform.isInitialized} pid=${process.pid}`);

  if (platform.isInitialized) {
    platform.logger.debug(`initPlatform returning existing platform pid=${process.pid}`);
    return platform;
  }

  platform.logger.debug(`initPlatform initializing NEW platform pid=${process.pid}`);
  const { adapters = {}, adapterOptions = {}, core = {} } = config;

  // 🔍 Detect if running in child process (sandbox worker)
  const isChildProcess = !!process.send; // Has IPC channel = forked child

  if (isChildProcess) {
    // ══════════════════════════════════════════════════════════════════════
    // CHILD PROCESS (Sandbox Worker)
    // ══════════════════════════════════════════════════════════════════════
    // Create IPC proxy adapters that forward calls to parent process.
    // This eliminates adapter duplication - only parent has real adapters.

    platform.logger.debug('initPlatform child process detected - creating proxy adapters');

    // Use Unix Socket transport by default (100-1000x faster than IPC for large messages)
    const { UnixSocketTransport } = await import('./transport/unix-socket-transport.js');
    const { VectorStoreProxy } = await import('./proxy/vector-store-proxy.js');
    const { CacheProxy } = await import('./proxy/cache-proxy.js');
    const { ConfigProxy } = await import('./proxy/config-proxy.js');
    const { LLMProxy } = await import('./proxy/llm-proxy.js');
    const { EmbeddingsProxy } = await import('./proxy/embeddings-proxy.js');
    const { StorageProxy } = await import('./proxy/storage-proxy.js');

    // Create single transport for all adapters
    const transport = new UnixSocketTransport();
    platform.logger.debug('initPlatform using Unix Socket transport');

    // Create proxy adapters (replace real adapters with IPC proxies)
    if (adapters.vectorStore) {
      platform.setAdapter('vectorStore', new VectorStoreProxy(transport));
      platform.logger.debug('initPlatform created VectorStoreProxy');
    }

    if (adapters.cache) {
      platform.setAdapter('cache', new CacheProxy(transport));
      platform.logger.debug('initPlatform created CacheProxy');
    }

    // Config adapter is ALWAYS created (not optional like other adapters)
    platform.setAdapter('config', new ConfigProxy(transport));
    platform.logger.debug('initPlatform created ConfigProxy');

    // LLM proxy is ALWAYS created (parent may have real LLM even if not in child config)
    platform.setAdapter('llm', new LLMProxy(transport));
    platform.logger.debug('initPlatform created LLMProxy');

    if (adapters.embeddings) {
      const embeddingsProxy = new EmbeddingsProxy(transport);
      await embeddingsProxy.getDimensions(); // Initialize dimensions before use
      platform.setAdapter('embeddings', embeddingsProxy);
      platform.logger.debug('initPlatform created EmbeddingsProxy');
    }

    if (adapters.storage) {
      platform.setAdapter('storage', new StorageProxy(transport));
      platform.logger.debug('initPlatform created StorageProxy');
    }

    // Core features are initialized normally (they don't duplicate resources)
    const coreFeatures = initializeCoreFeatures(platform, core);
    platform.initCoreFeatures(
      coreFeatures.workflows,
      coreFeatures.jobs,
      coreFeatures.cron,
      coreFeatures.resources
    );

    // Initialize ResourceBroker for queue and rate limiting
    const resourceBroker = initializeResourceBroker(platform, core.resourceBroker);
    platform.initResourceBroker(resourceBroker);
    platform.logger.debug('initPlatform initialized ResourceBroker');

    platform.logger.debug('initPlatform child process initialization complete');

  } else {
    // ══════════════════════════════════════════════════════════════════════
    // PARENT PROCESS (CLI bin)
    // ══════════════════════════════════════════════════════════════════════
    // Load real adapters (Qdrant, Redis, OpenAI, etc.)
    // Start IPC server to handle calls from child processes.

    platform.logger.debug('initPlatform parent process detected - loading real adapters');

    // Load adapters in parallel
    const adapterKeys = Object.keys(adapters) as (keyof typeof adapters)[];
    const loadPromises = adapterKeys
      .filter((key) => adapters[key]) // Only load non-null adapters
      .map(async (key) => {
        const adapterPath = adapters[key];
        if (typeof adapterPath !== 'string') return;

        const optionsForAdapter = adapterOptions[key];
        const instance = await loadAdapter<AdapterTypes[typeof key]>(adapterPath, cwd, optionsForAdapter);
        if (instance) {
          platform.setAdapter(key as keyof AdapterTypes, instance);
          platform.logger.debug(`initPlatform loaded adapter: ${key} → ${instance.constructor.name}`);
        }
      });

    await Promise.all(loadPromises);

    // Create ConfigAdapter (ALWAYS present, not loaded dynamically)
    const { ConfigAdapter } = await import('./adapters/config-adapter.js');
    platform.setAdapter('config', new ConfigAdapter());
    platform.logger.debug('initPlatform created ConfigAdapter');

    // Initialize core features
    const coreFeatures = initializeCoreFeatures(platform, core);
    platform.initCoreFeatures(
      coreFeatures.workflows,
      coreFeatures.jobs,
      coreFeatures.cron,
      coreFeatures.resources
    );

    // Initialize ResourceBroker for queue and rate limiting
    const resourceBroker = initializeResourceBroker(platform, core.resourceBroker);
    platform.initResourceBroker(resourceBroker);
    platform.logger.debug('initPlatform initialized ResourceBroker');

    // Start Unix Socket server to handle adapter calls from children
    const { createUnixSocketServer } = await import('./ipc/unix-socket-server.js');
    const socketServer = await createUnixSocketServer(platform);
    platform.logger.debug('initPlatform started Unix Socket server for child processes');

    platform.logger.debug('initPlatform parent process initialization complete');
  }

  return platform;
}

/**
 * Reset the platform to initial state (for testing).
 * Clears all adapters and core features.
 * Platform will use NoOp fallbacks until re-initialized.
 *
 * @example
 * ```typescript
 * // Before test
 * resetPlatform();
 * await initPlatform({ adapters: { llm: mockLLM } });
 *
 * // After test
 * resetPlatform();
 * ```
 */
export function resetPlatform(): void {
  platform.reset();
}
