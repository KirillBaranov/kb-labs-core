/**
 * @module @kb-labs/core-contracts
 *
 * Subprocess runner interface - contract for running handlers in subprocesses.
 */

import type { PluginContextDescriptor } from '@kb-labs/plugin-contracts';
import type { ExecutionMeta } from './execution-response.js';

/**
 * Result from subprocess execution.
 */
export interface RunResult<T> {
  /** Result data from handler */
  data: T;

  /** Execution metadata */
  executionMeta: ExecutionMeta;
}

/**
 * Options for subprocess execution.
 */
export interface SubprocessRunOptions {
  /** Plugin context descriptor */
  descriptor: PluginContextDescriptor;

  /** Platform socket path (Unix socket) */
  platformSocketPath: string;

  /** Platform auth token for gateway security */
  platformAuthToken: string;

  /** Handler file path */
  handlerPath: string;

  /** Handler export name (default: "default") */
  exportName?: string;

  /** Input data for handler */
  input: unknown;

  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Subprocess runner interface.
 *
 * Implemented by @kb-labs/plugin-runtime.
 * Used by @kb-labs/plugin-execution SubprocessBackend.
 */
export interface ISubprocessRunner {
  /**
   * Run handler in subprocess with IPC communication.
   *
   * @throws {PluginError} Handler execution failed
   * @throws {TimeoutError} Execution exceeded timeout
   * @throws {AbortError} Execution was cancelled
   */
  runInSubprocess<T>(options: SubprocessRunOptions): Promise<RunResult<T>>;
}
