/**
 * @module @kb-labs/core-contracts
 *
 * Execution response types for the execution layer.
 */

import type { ExecutionMeta } from '@kb-labs/plugin-contracts';

// Re-export for convenience
export type { ExecutionMeta } from '@kb-labs/plugin-contracts';

/**
 * Execution metadata - additional info about the execution.
 */
export interface ExecutionMetadata {
  /** Backend type that executed the request */
  backend: 'in-process' | 'subprocess' | 'worker-pool' | 'remote';

  /** Workspace ID used for execution */
  workspaceId?: string;

  /** Execution metadata from plugin runtime */
  executionMeta?: ExecutionMeta;
}

/**
 * Successful execution result.
 */
export interface ExecutionResult {
  /** Success indicator */
  ok: true;

  /** Result data from handler */
  data: unknown;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Execution metadata */
  metadata: ExecutionMetadata;
}

/**
 * Failed execution result.
 */
export interface ExecutionError {
  /** Failure indicator */
  ok: false;

  /** Error that occurred */
  error: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };

  /** Execution time in milliseconds (until error) */
  executionTimeMs: number;

  /** Execution metadata */
  metadata: ExecutionMetadata;
}

/**
 * Execution result - either success or error.
 */
export type ExecutionResponse = ExecutionResult | ExecutionError;

/**
 * Options for execution.
 */
export interface ExecuteOptions {
  /** Abort signal for cancellation */
  signal?: AbortSignal;

  /** Priority level */
  priority?: 'low' | 'normal' | 'high';
}
