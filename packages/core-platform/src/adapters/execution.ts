/**
 * @module @kb-labs/core-platform/adapters/execution
 * Execution backend interface (plugin execution layer).
 */

/**
 * Execution backend interface.
 * Handles plugin execution (in-process, worker-pool, or remote).
 *
 * Implementations:
 * - InProcessBackend: Same process, no isolation (dev mode)
 * - WorkerPoolBackend: Worker pool with fault isolation (production)
 * - RemoteExecutionBackend: Remote executor service (Phase 3)
 */
export interface IExecutionBackend {
  /**
   * Execute a plugin handler.
   *
   * @param request - Execution request with descriptor, pluginRoot, handlerRef
   * @param options - Optional execution options (signal, etc.)
   * @returns Execution result with data/error
   */
  execute(
    request: ExecutionRequest,
    options?: ExecuteOptions,
  ): Promise<ExecutionResult>;

  /**
   * Shutdown execution backend gracefully.
   * Closes worker pool, cleanup resources.
   */
  shutdown(): Promise<void>;
}

/**
 * Execution options (optional).
 */
export interface ExecuteOptions {
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Additional options */
  [key: string]: unknown;
}

/**
 * Execution request - minimal interface for core-platform.
 * Full implementation in @kb-labs/plugin-execution.
 */
export interface ExecutionRequest {
  /** Unique execution ID */
  executionId: string;

  /**
   * Runtime descriptor containing execution context.
   *
   * Type is `any` to allow implementations to use their concrete descriptor types
   * (e.g., PluginContextDescriptor from @kb-labs/plugin-contracts).
   *
   * This is intentional for interface contracts - concrete type determined by implementation.
   */
  descriptor: any;

  /** Plugin root directory (absolute path) */
  pluginRoot: string;

  /** Handler reference (relative path) */
  handlerRef: string;

  /** Input data passed to handler */
  input: unknown;

  /** Execution timeout in milliseconds */
  timeoutMs?: number;

  /** Additional configuration */
  [key: string]: unknown;
}

/**
 * Execution result - minimal interface for core-platform.
 * Full implementation in @kb-labs/plugin-execution.
 */
export interface ExecutionResult {
  /** Success flag */
  ok: boolean;

  /** Result data (if ok) */
  data?: unknown;

  /**
   * Error details (if !ok).
   * Type is `any` to allow implementations to use their own error types.
   * Expected to have at least { message: string } structure.
   */
  error?: any;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /**
   * Execution metadata (optional).
   * Contains backend-specific info, timing, plugin info.
   * Type is `any` to allow implementations to extend with their own metadata types.
   */
  metadata?: any;

  /** Additional fields allowed for extensibility */
  [key: string]: unknown;
}
