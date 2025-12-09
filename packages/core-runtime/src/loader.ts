/**
 * @module @kb-labs/core-runtime/loader
 * Platform initialization and adapter loading.
 */

import type { AdapterTypes, PlatformContainer } from './container.js';
import type { PlatformConfig, CoreFeaturesConfig } from './config.js';
import { platform } from './container.js';
import { resolveAdapter } from './discover-adapters.js';

import { ResourceManager } from './core/resource-manager.js';
import { JobScheduler } from './core/job-scheduler.js';
import { CronManager } from './core/cron-manager.js';
import { WorkflowEngine } from './core/workflow-engine.js';

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
  console.error(`[initPlatform] isInitialized=${platform.isInitialized}, pid=${process.pid}`);

  if (platform.isInitialized) {
    console.error(`[initPlatform] Returning existing platform (pid=${process.pid})`);
    return platform;
  }

  console.error(`[initPlatform] Initializing NEW platform (pid=${process.pid})`);
  const { adapters = {}, adapterOptions = {}, core = {} } = config;

  // 🔍 Detect if running in child process (sandbox worker)
  const isChildProcess = !!process.send; // Has IPC channel = forked child

  if (isChildProcess) {
    // ══════════════════════════════════════════════════════════════════════
    // CHILD PROCESS (Sandbox Worker)
    // ══════════════════════════════════════════════════════════════════════
    // Create IPC proxy adapters that forward calls to parent process.
    // This eliminates adapter duplication - only parent has real adapters.

    console.error('[initPlatform] Child process detected - creating IPC proxy adapters');

    // Dynamically import IPC classes (avoid circular deps)
    const { createIPCTransport } = await import('./transport/ipc-transport.js');
    const { VectorStoreProxy } = await import('./proxy/vector-store-proxy.js');
    const { CacheProxy } = await import('./proxy/cache-proxy.js');
    const { LLMProxy } = await import('./proxy/llm-proxy.js');
    const { EmbeddingsProxy } = await import('./proxy/embeddings-proxy.js');
    const { StorageProxy } = await import('./proxy/storage-proxy.js');

    // Create single transport for all adapters
    const transport = createIPCTransport();

    // Create proxy adapters (replace real adapters with IPC proxies)
    if (adapters.vectorStore) {
      platform.setAdapter('vectorStore', new VectorStoreProxy(transport));
      console.error('[initPlatform] Created VectorStoreProxy');
    }

    if (adapters.cache) {
      platform.setAdapter('cache', new CacheProxy(transport));
      console.error('[initPlatform] Created CacheProxy');
    }

    if (adapters.llm) {
      platform.setAdapter('llm', new LLMProxy(transport));
      console.error('[initPlatform] Created LLMProxy');
    }

    if (adapters.embeddings) {
      platform.setAdapter('embeddings', new EmbeddingsProxy(transport));
      console.error('[initPlatform] Created EmbeddingsProxy');
    }

    if (adapters.storage) {
      platform.setAdapter('storage', new StorageProxy(transport));
      console.error('[initPlatform] Created StorageProxy');
    }

    // Core features are initialized normally (they don't duplicate resources)
    const coreFeatures = initializeCoreFeatures(platform, core);
    platform.initCoreFeatures(
      coreFeatures.workflows,
      coreFeatures.jobs,
      coreFeatures.cron,
      coreFeatures.resources
    );

    console.error('[initPlatform] Child process initialization complete');

  } else {
    // ══════════════════════════════════════════════════════════════════════
    // PARENT PROCESS (CLI bin)
    // ══════════════════════════════════════════════════════════════════════
    // Load real adapters (Qdrant, Redis, OpenAI, etc.)
    // Start IPC server to handle calls from child processes.

    console.error('[initPlatform] Parent process detected - loading real adapters');

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
          console.error(`[initPlatform] Loaded adapter: ${key} → ${instance.constructor.name}`);
        }
      });

    await Promise.all(loadPromises);

    // Initialize core features
    const coreFeatures = initializeCoreFeatures(platform, core);
    platform.initCoreFeatures(
      coreFeatures.workflows,
      coreFeatures.jobs,
      coreFeatures.cron,
      coreFeatures.resources
    );

    // Start IPC server to handle adapter calls from children
    const { createIPCServer } = await import('./ipc/ipc-server.js');
    const ipcServer = createIPCServer(platform);
    console.error('[initPlatform] Started IPC server for child processes');

    console.error('[initPlatform] Parent process initialization complete');
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
