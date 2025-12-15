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
}
