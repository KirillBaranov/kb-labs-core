/**
 * @module @kb-labs/core-runtime/loader
 * Platform initialization and adapter loading.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promises as fs } from 'node:fs';
import type { AdapterTypes, PlatformContainer } from './container.js';
import type { PlatformConfig, CoreFeaturesConfig, ResourceBrokerConfig, LLMAdapterOptions, AdapterValue } from './config.js';
import { platform } from './container.js';
import { resolveAdapter } from './discover-adapters.js';
import { createAnalyticsContext } from './analytics-context.js';
import { AdapterLoader } from './adapter-loader.js';
import type { AdapterConfig, LoadedAdapterModule } from './adapter-loader.js';

import { ResourceManager } from './core/resource-manager.js';
import { JobScheduler } from './core/job-scheduler.js';
import { CronManager } from './core/cron-manager.js';
import { WorkflowEngine } from './core/workflow-engine.js';

// Import analytics wrappers for transparent metrics collection
import {
  AnalyticsLLM,
  AnalyticsEmbeddings,
  AnalyticsVectorStore,
  AnalyticsCache,
  AnalyticsStorage,
} from '@kb-labs/core-platform';

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

// Import ExecutionBackend type only (implementation loaded dynamically to break circular dependency)
import type { IExecutionBackend } from '@kb-labs/core-contracts';

/**
 * Adapter factory function type.
 * Adapters should export a createAdapter function.
 */
type AdapterFactory<T> = (config?: unknown) => T | Promise<T>;

/**
 * Normalize adapter value to array format.
 * - string → [string]
 * - string[] → string[]
 * - null/undefined → []
 *
 * @param value - Adapter value (string, string[], or null)
 * @returns Array of adapter package paths
 */
function normalizeAdapterValue(value: AdapterValue | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Get primary adapter from value (first in array or single string).
 *
 * @param value - Adapter value
 * @returns Primary adapter package path or undefined
 */
function getPrimaryAdapter(value: AdapterValue | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

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
 * Wrap an adapter with analytics tracking.
 * Returns the wrapped adapter if analytics is available, otherwise returns the original adapter.
 *
 * @param key - Adapter type key
 * @param instance - Real adapter instance
 * @returns Wrapped adapter with analytics or original adapter
 */
function wrapWithAnalytics<K extends keyof AdapterTypes>(
  key: K,
  instance: AdapterTypes[K]
): AdapterTypes[K] {
  const analytics = platform.analytics;

  // If no analytics adapter, return original (graceful degradation)
  if (!analytics || analytics.constructor.name === 'NoOpAnalytics') {
    return instance;
  }

  // Wrap each adapter type with its corresponding analytics wrapper
  switch (key) {
    case 'llm':
      return new AnalyticsLLM(instance as any, analytics) as unknown as AdapterTypes[K];
    case 'embeddings':
      return new AnalyticsEmbeddings(instance as any, analytics) as unknown as AdapterTypes[K];
    case 'vectorStore':
      return new AnalyticsVectorStore(instance as any, analytics) as unknown as AdapterTypes[K];
    case 'cache':
      return new AnalyticsCache(instance as any, analytics) as unknown as AdapterTypes[K];
    case 'storage':
      return new AnalyticsStorage(instance as any, analytics) as unknown as AdapterTypes[K];
    default:
      // For adapters without analytics wrappers (config, etc.), return original
      return instance;
  }
}

/**
 * Initialize core features with real implementations.
 */
function initializeCoreFeatures(
  container: PlatformContainer,
  config: CoreFeaturesConfig = {}
): {
  workflows: any; // TODO: Re-enable when workflow-engine is ported to V3
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
          return await realEmbeddings.embedBatch(args[0] as string[]);
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
  cwd: string = process.cwd(),
  uiProvider?: (hostType: string) => any
): Promise<PlatformContainer> {

  // ✅ Idempotent: If already initialized, return existing singleton
  // This prevents duplicate adapter instances across CLI and sandbox processes
  platform.logger.debug(`initPlatform isInitialized=${platform.isInitialized} pid=${process.pid}`);

  if (platform.isInitialized) {
    platform.logger.debug(`initPlatform returning existing platform pid=${process.pid}`);
    return platform;
  }

  platform.logger.debug(`initPlatform initializing NEW platform pid=${process.pid}`);
  const { adapters = {}, adapterOptions = {}, core = {}, execution = {} } = config;

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

    // ⚠️ CRITICAL: Do NOT create ExecutionBackend in child process!
    // Child processes ARE the workers - creating backend here would spawn infinite workers.
    // ExecutionBackend is ONLY created in parent process.

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

    // Create analytics context for auto-enrichment (once per execution)
    const analyticsContext = await createAnalyticsContext(cwd);
    platform.logger.debug('initPlatform created analytics context', {
      product: analyticsContext.source.product,
      version: analyticsContext.source.version,
      actorType: analyticsContext.actor?.type,
      runId: analyticsContext.runId,
    });

    // Use AdapterLoader for dependency resolution and proper loading order
    const loader = new AdapterLoader();

    // Create runtime contexts registry
    // Adapters declare which contexts they need via manifest.contexts
    const runtimeContexts: Record<string, unknown> = {
      workspace: { cwd },
      analytics: analyticsContext,
    };

    // Module loader function - defined before loop so we can pre-load manifests
    const loadModule = async (modulePath: string): Promise<LoadedAdapterModule> => {
      try {
        const { discoverAdapters } = await import('./discover-adapters.js');
        const discovered = await discoverAdapters(cwd);

        // Parse module path into base package and subpath (same logic as resolveAdapter)
        const basePkgName = modulePath.split('/').slice(0, 2).join('/'); // "@kb-labs/adapters-openai"
        const subpath =
          modulePath.includes('/') && modulePath.split('/').length > 2
            ? modulePath.split('/').slice(2).join('/')
            : null; // "embeddings" or null

        const adapter = discovered.get(basePkgName);

        if (adapter && subpath) {
          // Load subpath export from workspace adapter
          const subpathFile = path.join(adapter.pkgRoot, 'dist', `${subpath}.js`);
          try {
            await fs.access(subpathFile);
            const module = await import(pathToFileURL(subpathFile).href);

            const factory = module.createAdapter || module.default;
            const manifest = module.manifest;

            if (!factory) {
              throw new Error(
                `Subpath ${modulePath} has no createAdapter or default export`
              );
            }

            if (!manifest) {
              throw new Error(
                `Subpath ${modulePath} has no manifest export`
              );
            }

            return { createAdapter: factory, manifest };
          } catch (err) {
            // Subpath file doesn't exist, try loading base package
            const baseModule = await import(
              pathToFileURL(
                path.join(adapter.pkgRoot, 'dist', 'index.js')
              ).href
            );

            const factory = baseModule.createAdapter || baseModule.default;
            const manifest = baseModule.manifest;

            if (!factory) {
              throw new Error(
                `Module ${modulePath} has no createAdapter or default export`
              );
            }

            if (!manifest) {
              throw new Error(
                `Module ${modulePath} has no manifest export`
              );
            }

            return { createAdapter: factory, manifest };
          }
        } else if (adapter) {
          // Load base package (no subpath)
          const module = await import(
            pathToFileURL(
              path.join(adapter.pkgRoot, 'dist', 'index.js')
            ).href
          );

          const factory = module.createAdapter || module.default;
          const manifest = module.manifest;

          if (!factory) {
            throw new Error(
              `Module ${modulePath} has no createAdapter or default export`
            );
          }

          if (!manifest) {
            throw new Error(
              `Module ${modulePath} has no manifest export`
            );
          }

          return { createAdapter: factory, manifest };
        } else {
          // Fallback to node_modules
          const module = await import(modulePath);

          const factory = module.createAdapter || module.default;
          const manifest = module.manifest;

          if (!factory) {
            throw new Error(
              `Module ${modulePath} has no createAdapter or default export`
            );
          }

          if (!manifest) {
            throw new Error(
              `Module ${modulePath} has no manifest export`
            );
          }

          return { createAdapter: factory, manifest };
        }
      } catch (error) {
        throw new Error(
          `Failed to load adapter module ${modulePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    // Build adapter configs for AdapterLoader
    // Supports both single adapter (string) and multi-adapter (string[]) config
    const adapterConfigs: Record<string, AdapterConfig> = {};

    // Track all available adapters for multi-adapter routing (LLM tier switching, etc.)
    const availableAdapters: Record<string, string[]> = {};

    for (const [name, adapterValue] of Object.entries(adapters)) {
      // Normalize to array and get primary adapter
      const adapterPackages = normalizeAdapterValue(adapterValue as AdapterValue);
      const primaryAdapter = getPrimaryAdapter(adapterValue as AdapterValue);

      if (!primaryAdapter) continue;

      // Store all available adapters for this type (used by LLMRouter, etc.)
      availableAdapters[name] = adapterPackages;

      try {
        // Pre-load module to access manifest (primary adapter only)
        const module = await loadModule(primaryAdapter);
        const baseOptions = (adapterOptions as Record<string, unknown>)[name] ?? {};

        // Inject requested contexts from manifest
        const requestedContexts = module.manifest.contexts ?? [];
        const contexts: Record<string, unknown> = {};

        for (const ctxName of requestedContexts) {
          if (runtimeContexts[ctxName]) {
            contexts[ctxName] = runtimeContexts[ctxName];
          }
        }

        adapterConfigs[name] = {
          module: primaryAdapter,
          // Merge contexts with user options (user options can override)
          config: { ...contexts, ...baseOptions },
        };

        // Log multi-adapter setup
        if (adapterPackages.length > 1) {
          platform.logger.debug(`initPlatform multi-adapter setup for ${name}`, {
            primary: primaryAdapter,
            available: adapterPackages,
          });
        }
      } catch (error) {
        throw error;
      }
    }

    // Load adapters with dependency resolution
    const loadedAdapters = await loader.loadAdapters(adapterConfigs, loadModule);

    // CRITICAL: Set analytics adapter FIRST (without wrapping) so wrapWithAnalytics() can use it
    if (loadedAdapters.has('analytics')) {
      platform.setAdapter('analytics', loadedAdapters.get('analytics') as any);
      platform.logger.debug('initPlatform loaded adapter: analytics → FileAnalytics (set early for wrapping)');
    }

    // Set adapters in platform (wrapped with analytics if available)
    // NOTE: LLM gets special handling - LLMRouter wraps AFTER ResourceBroker
    // Chain will be: LLMRouter → QueuedLLM → AnalyticsLLM → RawAdapter
    for (const [name, instance] of loadedAdapters.entries()) {
      // Skip analytics - already set above
      if (name === 'analytics') {
        continue;
      }

      // For LLM: only wrap with Analytics here, Router wrapping happens after ResourceBroker
      const wrappedInstance = wrapWithAnalytics(name as keyof AdapterTypes, instance as any);
      platform.setAdapter(name, wrappedInstance);

      const wrapperName = (wrappedInstance as any).constructor?.name ?? 'Unknown';
      const isWrapped = wrapperName.startsWith('Analytics');
      platform.logger.debug(
        `initPlatform loaded adapter: ${name} → ${(instance as any).constructor.name}${isWrapped ? ` (wrapped with ${wrapperName})` : ''}`
      );
    }

    // Get dependency graph for extension connection
    const graph = await loader.buildDependencyGraph(adapterConfigs, loadModule);
    loader.connectExtensions(loadedAdapters, graph);

    // Create ConfigAdapter (ALWAYS present, not loaded dynamically)
    try {
      const { ConfigAdapter } = await import('./adapters/config-adapter.js');
      platform.setAdapter('config', new ConfigAdapter());
      platform.logger.debug('initPlatform created ConfigAdapter');
    } catch (error) {
      platform.logger.warn('Failed to create ConfigAdapter, using NoOp fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // Initialize ExecutionBackend (AFTER adapters, BEFORE core features)
    // CRITICAL: ExecutionBackend is REQUIRED - all execution goes through it
    // ══════════════════════════════════════════════════════════════════════
    try {
      // Use dynamic import from plugin-execution-factory to eliminate circular dependency
      // plugin-execution-factory has no dependency on core-runtime
      const { createExecutionBackend } = await import('@kb-labs/plugin-execution-factory');

      // Map config types to backend options (explicit mapping, no type casts)
      const executionBackend = createExecutionBackend({
        platform: platform, // PlatformServices interface (adapters only)
        mode: execution.mode ?? 'auto',
        uiProvider, // Pass UI provider from caller (CLI, REST API, etc.)
        workerPool: execution.workerPool ? {
          min: execution.workerPool.min,
          max: execution.workerPool.max,
          maxRequestsPerWorker: execution.workerPool.maxRequestsPerWorker,
          maxUptimeMsPerWorker: execution.workerPool.maxUptimeMsPerWorker,
          maxConcurrentPerPlugin: execution.workerPool.maxConcurrentPerPlugin,
          warmup: execution.workerPool.warmup ? {
            mode: execution.workerPool.warmup.mode ?? 'none',
            topN: execution.workerPool.warmup.topN,
            maxHandlers: execution.workerPool.warmup.maxHandlers,
          } : undefined,
        } : undefined,
        remote: execution.remote ? {
          endpoint: execution.remote.endpoint ?? '',
          } : undefined,
      });

      platform.initExecutionBackend(executionBackend);

      platform.logger.debug('initPlatform initialized ExecutionBackend', {
        mode: execution.mode ?? 'auto',
        hasWorkerPool: !!execution.workerPool,
        configPath: 'platform.execution',
      });
    } catch (error) {
      // In test environment, @kb-labs/plugin-execution may not be available
      // Only warn if in test environment (NODE_ENV=test or vitest detected)
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

      if (isTestEnv) {
        platform.logger.warn('ExecutionBackend initialization failed in test environment', {
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        // In production/development, ExecutionBackend is REQUIRED
        platform.logger.error('ExecutionBackend initialization failed');
        throw error;
      }
    }

    // Initialize core features (gracefully degrade if workflow unavailable)
    try {
      const coreFeatures = initializeCoreFeatures(platform, core);
      platform.initCoreFeatures(
        coreFeatures.workflows,
        coreFeatures.jobs,
        coreFeatures.cron,
        coreFeatures.resources
      );
      platform.logger.debug('initPlatform initialized core features');
    } catch (error) {
      platform.logger.warn('Failed to initialize core features, continuing without them', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Initialize ResourceBroker for queue and rate limiting (optional)
    try {
      const resourceBroker = initializeResourceBroker(platform, core.resourceBroker);
      platform.initResourceBroker(resourceBroker);
      platform.logger.debug('initPlatform initialized ResourceBroker');
    } catch (error) {
      platform.logger.warn('Failed to initialize ResourceBroker, continuing without rate limiting', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // Wrap LLM with Router (AFTER ResourceBroker)
    // Chain: LLMRouter → QueuedLLM → AnalyticsLLM → RawAdapter
    // This ensures useLLM({ tier }) can call resolve() on the outermost wrapper
    // ══════════════════════════════════════════════════════════════════════
    if (platform.hasAdapter('llm')) {
      const llmOptions = (adapterOptions.llm ?? {}) as LLMAdapterOptions;

      try {
        const { LLMRouter } = await import('@kb-labs/llm-router');

        // Get current LLM (already QueuedLLM → AnalyticsLLM → RawAdapter)
        const queuedLLM = platform.llm;

        // Create adapter loader function for multi-adapter support
        const adapterLoader = async (adapterPackage: string): Promise<any> => {
          try {
            const module = await loadModule(adapterPackage);
            const loadedAdapter = await module.createAdapter(llmOptions, {});
            platform.logger.debug(`LLMRouter loaded adapter: ${adapterPackage}`);
            return loadedAdapter;
          } catch (error) {
            platform.logger.warn(`Failed to load adapter ${adapterPackage}`, {
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        };

        // Build router config from adapter options
        const routerConfig = {
          defaultTier: llmOptions.defaultTier ?? llmOptions.tier ?? 'small',
          tierMapping: llmOptions.tierMapping,
          capabilities: llmOptions.capabilities,
          adapterLoader,
        };

        const llmRouter = new LLMRouter(
          queuedLLM,
          routerConfig,
          platform.logger
        );

        // Replace LLM adapter with Router-wrapped version
        platform.setAdapter('llm', llmRouter);

        const modelInfo = llmOptions.tierMapping
          ? `tierMapping with ${Object.keys(llmOptions.tierMapping).length} tiers`
          : `tier: ${routerConfig.defaultTier}`;

        const llmAdapters = availableAdapters['llm'] ?? [];
        if (llmAdapters.length > 1) {
          platform.logger.debug(`initPlatform LLM multi-adapter enabled`, {
            adapters: llmAdapters,
            primary: llmAdapters[0],
          });
        }

        platform.logger.debug(`initPlatform wrapped LLM with Router (${modelInfo})`);
      } catch (error) {
        // LLMRouter not available - keep QueuedLLM as is
        platform.logger.debug('LLMRouter not available, using QueuedLLM directly', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Start Unix Socket server to handle adapter calls from children (critical for V3 plugins)
    try {
      const { createUnixSocketServer } = await import('./ipc/unix-socket-server.js');
      const socketServer = await createUnixSocketServer(platform);
      platform.initSocketServer(socketServer);
      platform.logger.debug('initPlatform started Unix Socket server for child processes');
    } catch (error) {
      platform.logger.warn('Failed to start UnixSocketServer, V3 plugin execution will be unavailable', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

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
