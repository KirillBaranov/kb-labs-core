/**
 * @module @kb-labs/core-runtime/run-executor
 * Bridge between run orchestration and execution backend.
 */

import type {
  IExecutionBackend,
  ExecutionRequest,
  ExecutionResult,
} from '@kb-labs/core-platform';

/**
 * Request for run step execution.
 */
export interface RunStepExecutionRequest {
  runId: string;
  stepId: string;
  environmentId?: string;
  execution: ExecutionRequest;
}

/**
 * Run executor that enriches execution metadata with run/environment context.
 */
export class RunExecutor {
  constructor(
    private readonly executionBackend: IExecutionBackend,
    private readonly logger: { debug(message: string, meta?: Record<string, unknown>): void }
  ) {}

  /**
   * Execute one run step through the shared execution backend.
   */
  async executeStep(request: RunStepExecutionRequest): Promise<ExecutionResult> {
    const { runId, stepId, environmentId, execution } = request;

    const descriptor =
      execution.descriptor && typeof execution.descriptor === 'object'
        ? {
            ...(execution.descriptor as Record<string, unknown>),
            run: {
              runId,
              stepId,
              environmentId,
            },
          }
        : {
            run: {
              runId,
              stepId,
              environmentId,
            },
          };

    this.logger.debug('RunExecutor: executing step', {
      runId,
      stepId,
      environmentId,
      executionId: execution.executionId,
      pluginRoot: execution.pluginRoot,
      handlerRef: execution.handlerRef,
    });

    return this.executionBackend.execute({
      ...execution,
      descriptor,
    });
  }
}

