/**
 * @module @kb-labs/core-runtime/config
 * Platform configuration types.
 */

import type { TenantQuotas } from '@kb-labs/core-platform';
import type { RateLimitConfig, RateLimitPreset } from '@kb-labs/core-resource-broker';

/**
 * Platform adapter configuration.
 * Each key is the adapter name, value is the package path or null for NoOp.
 */
export interface AdaptersConfig {
  /** Analytics adapter package (e.g., "@kb-labs/analytics-adapter") */
  analytics?: string | null;
  /** Vector store adapter package (e.g., "@kb-labs/mind-qdrant") */
  vectorStore?: string | null;
  /** LLM adapter package (e.g., "@kb-labs/shared-openai") */
  llm?: string | null;
  /** Embeddings adapter package (e.g., "@kb-labs/shared-openai") */
  embeddings?: string | null;
  /** Cache adapter package (e.g., "@kb-labs/core-redis") */
  cache?: string | null;
  /** Storage adapter package (e.g., "@kb-labs/core-fs") */
  storage?: string | null;
  /** Logger adapter package (e.g., "@kb-labs/core-pino") */
  logger?: string | null;
  /** Event bus adapter package */
  eventBus?: string | null;
}

/**
 * Resource manager configuration.
 */
export interface ResourcesConfig {
  /** Default quotas for tenants without explicit quotas */
  defaultQuotas?: Partial<TenantQuotas>;
}

/**
 * Job scheduler configuration.
 */
export interface JobsConfig {
  /** Maximum concurrent jobs per tenant */
  maxConcurrent?: number;
  /** Poll interval in milliseconds for job queue */
  pollInterval?: number;
}

/**
 * Workflow engine configuration.
 */
export interface WorkflowsConfig {
  /** Maximum concurrent workflows per tenant */
  maxConcurrent?: number;
  /** Default workflow timeout in milliseconds */
  defaultTimeout?: number;
}

/**
 * Execution backend configuration.
 * Determines how plugins execute (in-process, worker-pool, remote).
 */
export interface ExecutionConfig {
  /**
   * Execution mode:
   * - 'auto' (default): Auto-detect from environment (EXECUTION_MODE, KUBERNETES_SERVICE_HOST)
   * - 'in-process': Same process, no isolation (dev mode, fast iteration)
   * - 'worker-pool': Worker pool with fault isolation (production, single-node)
   * - 'remote': Remote executor service (Phase 3, distributed fleet)
   * @default 'auto'
   */
  mode?: 'auto' | 'in-process' | 'worker-pool' | 'remote';

  /**
   * Worker pool options (used when mode=worker-pool or auto-detected).
   */
  workerPool?: {
    /** Minimum workers to keep alive @default 2 */
    min?: number;
    /** Maximum concurrent workers @default 10 */
    max?: number;
    /** Max requests per worker before recycling @default 1000 */
    maxRequestsPerWorker?: number;
    /** Max worker uptime before recycling (ms) @default 1800000 (30min) */
    maxUptimeMsPerWorker?: number;
    /** Max concurrent requests per plugin (optional) */
    maxConcurrentPerPlugin?: number;
    /** Warmup policy */
    warmup?: {
      /**
       * Warmup mode (matches plugin-execution types):
       * - 'none': No warmup (cold start on first request)
       * - 'top-n': Warmup top N most-used handlers
       * - 'marked': Warmup handlers marked with warmup: true in manifest
       * @default 'none'
       */
      mode?: 'none' | 'top-n' | 'marked';
      /** Warmup top N most used handlers (for top-n mode) @default 5 */
      topN?: number;
      /** Max handlers to warmup (safety limit) @default 20 */
      maxHandlers?: number;
    };
  };

  /**
   * Remote executor options (used when mode=remote, Phase 3).
   */
  remote?: {
    /** Remote executor service endpoint (gRPC or HTTP) */
    endpoint?: string;
  };
}

/**
 * Resource broker configuration for rate limiting and queue management.
 */
export interface ResourceBrokerConfig {
  /**
   * Use distributed backend via StateBroker.
   * false = InMemoryRateLimitBackend (single process)
   * true = StateBrokerRateLimitBackend (distributed, requires StateBroker daemon)
   * @default false
   */
  distributed?: boolean;

  /**
   * LLM resource configuration.
   */
  llm?: {
    /** Rate limits (preset name or custom config) */
    rateLimits?: RateLimitConfig | RateLimitPreset;
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Request timeout in ms */
    timeout?: number;
  };

  /**
   * Embeddings resource configuration.
   */
  embeddings?: {
    /** Rate limits (preset name or custom config) */
    rateLimits?: RateLimitConfig | RateLimitPreset;
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Request timeout in ms */
    timeout?: number;
  };

  /**
   * Vector store resource configuration.
   */
  vectorStore?: {
    /** Maximum concurrent requests */
    maxConcurrent?: number;
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Request timeout in ms */
    timeout?: number;
  };
}

/**
 * Core features configuration.
 */
export interface CoreFeaturesConfig {
  /** Resource manager configuration */
  resources?: ResourcesConfig;
  /** Job scheduler configuration */
  jobs?: JobsConfig;
  /** Workflow engine configuration */
  workflows?: WorkflowsConfig;
  /** Resource broker configuration */
  resourceBroker?: ResourceBrokerConfig;
}

/**
 * Full platform configuration.
 */
export interface PlatformConfig {
  /** Adapter packages configuration */
  adapters?: AdaptersConfig;
  /** Optional adapter-specific configuration passed to createAdapter(config) */
  adapterOptions?: Partial<Record<keyof AdaptersConfig, unknown>>;
  /** Core features configuration */
  core?: CoreFeaturesConfig;
  /** Execution backend configuration (NEW: unified plugin execution) */
  execution?: ExecutionConfig;
}
