/**
 * @module @kb-labs/core-runtime/config
 * Platform configuration types.
 */

import type { TenantQuotas } from '@kb-labs/core-platform';

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
 * Core features configuration.
 */
export interface CoreFeaturesConfig {
  /** Resource manager configuration */
  resources?: ResourcesConfig;
  /** Job scheduler configuration */
  jobs?: JobsConfig;
  /** Workflow engine configuration */
  workflows?: WorkflowsConfig;
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
