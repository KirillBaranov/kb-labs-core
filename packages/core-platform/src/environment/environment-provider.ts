/**
 * @module @kb-labs/core-platform/environment/environment-provider
 * Environment lifecycle abstraction.
 *
 * This port manages long-lived execution environments (container/pod/vm/sandbox).
 * It intentionally does NOT execute plugin jobs directly.
 */

/**
 * Environment status in lifecycle.
 */
export type EnvironmentStatus =
  | "pending"
  | "provisioning"
  | "ready"
  | "degraded"
  | "terminating"
  | "terminated"
  | "failed";

/**
 * Environment resource limits.
 */
export interface EnvironmentResources {
  cpu?: string;
  memory?: string;
  disk?: string;
  gpu?: string;
}

/**
 * Environment lease metadata.
 */
export interface EnvironmentLease {
  leaseId: string;
  acquiredAt: string;
  expiresAt: string;
  owner?: string;
}

/**
 * Environment network endpoint descriptor.
 */
export interface EnvironmentEndpoint {
  name: string;
  protocol?: "http" | "https" | "tcp" | "udp" | "unix";
  host?: string;
  port?: number;
  path?: string;
}

/**
 * Environment creation request.
 */
export interface CreateEnvironmentRequest {
  tenantId?: string;
  namespace?: string;
  runId?: string;
  templateId?: string;
  image?: string;
  workspacePath?: string;
  command?: string[];
  env?: Record<string, string>;
  resources?: EnvironmentResources;
  ttlMs?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Created environment descriptor.
 */
export interface EnvironmentDescriptor {
  environmentId: string;
  provider: string;
  status: EnvironmentStatus;
  createdAt: string;
  updatedAt: string;
  lease?: EnvironmentLease;
  endpoints?: EnvironmentEndpoint[];
  metadata?: Record<string, unknown>;
}

/**
 * Environment status result.
 */
export interface EnvironmentStatusResult {
  environmentId: string;
  status: EnvironmentStatus;
  reason?: string;
  updatedAt: string;
  lease?: EnvironmentLease;
}

/**
 * Environment provider capabilities.
 */
export interface EnvironmentProviderCapabilities {
  supportsLeaseRenewal?: boolean;
  supportsSnapshots?: boolean;
  supportsExecProbe?: boolean;
  supportsLogs?: boolean;
  custom?: Record<string, unknown>;
}

/**
 * Long-lived environment provider abstraction.
 *
 * Responsibilities:
 * - Provision, inspect, and destroy environments
 * - Manage lease lifecycle
 *
 * Non-responsibilities:
 * - Plugin/job dispatch and horizontal runner scaling (ExecutionBackend)
 */
export interface IEnvironmentProvider {
  /**
   * Create a new environment instance.
   */
  create(request: CreateEnvironmentRequest): Promise<EnvironmentDescriptor>;

  /**
   * Get current status for an environment.
   */
  getStatus(environmentId: string): Promise<EnvironmentStatusResult>;

  /**
   * Destroy environment and release resources.
   * Must be idempotent.
   */
  destroy(environmentId: string, reason?: string): Promise<void>;

  /**
   * Renew environment lease (if provider supports it).
   */
  renewLease?(environmentId: string, ttlMs: number): Promise<EnvironmentLease>;

  /**
   * Provider capability declaration.
   */
  getCapabilities?(): EnvironmentProviderCapabilities;
}
