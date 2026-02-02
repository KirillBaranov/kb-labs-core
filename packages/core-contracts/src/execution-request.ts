/**
 * @module @kb-labs/core-contracts
 *
 * Execution request types for the execution layer.
 */

import type {
  PluginContextDescriptor,
} from "@kb-labs/plugin-contracts";

/**
 * Execution request - describes a handler invocation.
 */
export interface ExecutionRequest {
  /** Unique execution ID for correlation */
  executionId: string;

  /** Plugin identifier */
  pluginId: string;

  /** Plugin version */
  pluginVersion: string;

  /** Handler file path (relative to plugin root) */
  handlerPath: string;

  /** Export name (default: "default") */
  exportName?: string;

  /** Input data for the handler */
  input: unknown;

  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Execution context for correlation and multi-tenancy */
  context?: {
    tenantId?: string;
    traceId?: string;
    sessionId?: string;
  };

  /** Workspace identifier */
  workspace: string;

  /** Plugin root directory */
  pluginRoot: string;

  /** Plugin context descriptor (for creating runtime context) */
  descriptor: PluginContextDescriptor;
}

/**
 * ExecutionRequest → RequestContext Mapping Rule
 *
 * When backend executes a request, it creates RequestContext for platform calls:
 *
 * ExecutionRequest → RequestContext:
 *   executionId     → ctx.executionId   (required, correlation ID)
 *   context.tenantId → ctx.tenantId     (optional, multi-tenancy)
 *   context.traceId  → ctx.traceId      (optional, distributed tracing)
 *   [auth token]     → ctx.authToken    (from KB_PLATFORM_SOCKET_TOKEN)
 *
 * Example flow:
 * 1. CLI receives: { executionId: 'exec-123', context: { tenantId: 'acme' } }
 * 2. Backend passes to runner: platformAuthToken = platformServer.getAuthToken()
 * 3. Runner sets env vars: KB_EXECUTION_ID='exec-123', KB_TENANT_ID='acme', KB_PLATFORM_SOCKET_TOKEN='...'
 * 4. Worker reads env vars and creates RequestContext
 * 5. Every platform call includes: { executionId: 'exec-123', tenantId: 'acme', authToken: '...' }
 * 6. Platform server validates authToken, uses executionId for logging/correlation
 */
