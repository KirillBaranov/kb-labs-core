/**
 * @module @kb-labs/core-sandbox/runner/execution/handler-executor
 * Execute handler functions with proper context and error handling
 */

import type { ExecutionContext } from '../../types/index';
import type { CliHandlerContext, RestHandlerContext, JobHandlerContext } from '../../types/adapter-context';
import type { Output } from '@kb-labs/core-sys/output';
import { SANDBOX_ERROR_CODES } from '../../errors/error-codes';

export interface HandlerExecutorOptions {
  handlerFn: (...args: any[]) => Promise<unknown>;
  input: unknown;
  ctx: ExecutionContext;
  output: Output;
}

export type HandlerResult =
  | { ok: true; data: unknown }
  | { ok: false; error: { code: string; message: string; stack?: string } };

/**
 * Execute handler function based on adapter signature
 *
 * Handles three signatures:
 * - CLI command: (ctx, argv, flags) - for CLI commands
 * - Job: (input, ctx) - for scheduled jobs with runtime APIs
 * - Request/REST: (input, ctx) - for REST handlers or basic execution
 *
 * @param options - Executor options
 * @returns Result object with success/error status
 */
export async function executeHandlerFn(options: HandlerExecutorOptions): Promise<HandlerResult> {
  const { handlerFn, input, ctx, output } = options;

  try {
    // Execute handler based on adapter signature
    let result: unknown;
    const adapterMeta = ctx.adapterMeta;

    if (adapterMeta?.signature === 'command' && ctx.adapterContext?.type === 'cli') {
      // CLI command signature: (ctx, argv, flags)
      const cmdCtx = ctx.adapterContext as CliHandlerContext;
      // Ensure flags is always an object, never undefined
      const flags = cmdCtx.flags || {};
      try {
        result = await handlerFn(cmdCtx, cmdCtx.argv, flags);
      } catch (error) {
        output.error(`Handler threw error: ${error instanceof Error ? error.message : String(error)}`, {
          code: SANDBOX_ERROR_CODES.HANDLER_EXECUTION_ERROR,
        });
        if (error instanceof Error && error.stack) {
          output.debug(`Error stack: ${error.stack}`);
        }
        throw error;
      }
    } else if (adapterMeta?.signature === 'job') {
      // Job signature: (input, ctx) with runtime APIs
      // Input contains: { jobId, executedAt (ISO string), runCount }
      // Context has: runtime.fs, runtime.fetch, runtime.env (from buildRuntime in context-recreator)
      const jobInput = input as { jobId?: string; executedAt?: string; runCount?: number };

      // Parse executedAt back to Date if it's a string
      const parsedInput = {
        ...jobInput,
        executedAt: jobInput.executedAt ? new Date(jobInput.executedAt) : new Date(),
      };

      // Build job context with runtime from adapterContext (set by context-recreator)
      const jobCtx: JobHandlerContext = {
        type: 'job',
        requestId: ctx.requestId,
        workdir: ctx.workdir,
        outdir: ctx.outdir,
        pluginId: ctx.pluginId,
        pluginVersion: ctx.pluginVersion,
        traceId: ctx.traceId,
        spanId: ctx.spanId,
        parentSpanId: ctx.parentSpanId,
        debug: ctx.debug,
        // Runtime APIs from buildRuntime() (set in context-recreator)
        runtime: (ctx.adapterContext as any)?.runtime,
        output: (ctx.adapterContext as any)?.output,
        api: (ctx.adapterContext as any)?.api,
      };

      output.debug('Executing job handler', {
        jobId: parsedInput.jobId,
        hasRuntime: !!jobCtx.runtime,
        hasFs: !!jobCtx.runtime?.fs,
      });

      result = await handlerFn(parsedInput, jobCtx);
    } else {
      // REST/Request signature: (input, ctx)
      const restCtx = ctx.adapterContext as RestHandlerContext | undefined;
      if (restCtx) {
        result = await handlerFn(input, restCtx);
      } else {
        // Fallback to basic context
        result = await handlerFn(input, {
          requestId: ctx.requestId,
          workdir: ctx.workdir,
          outdir: ctx.outdir,
          pluginId: ctx.pluginId,
          pluginVersion: ctx.pluginVersion,
          traceId: ctx.traceId,
          spanId: ctx.spanId,
          parentSpanId: ctx.parentSpanId,
          debug: ctx.debug,
        });
      }
    }

    // Handle numeric exit codes (CLI handlers return numbers)
    if (typeof result === 'number') {
      if (result === 0) {
        return { ok: true, data: result };
      } else {
        output.error(`Handler returned non-zero exit code: ${result}`, {
          code: SANDBOX_ERROR_CODES.HANDLER_EXIT_CODE,
        });
        return {
          ok: false,
          error: {
            code: 'HANDLER_EXIT_CODE',
            message: `Handler returned exit code ${result}`,
            stack: undefined,
          },
        };
      }
    }

    return { ok: true, data: result };
  } catch (error) {
    output.error(`Handler execution failed: ${error instanceof Error ? error.message : String(error)}`, {
      code: SANDBOX_ERROR_CODES.HANDLER_EXECUTION_FAILED,
    });
    if (error instanceof Error && error.stack) {
      output.debug(`Stack trace: ${error.stack}`);
    }

    // Return normalized error
    const errorObj = error instanceof Error ? error : new Error(String(error));
    return {
      ok: false,
      error: {
        code: (errorObj as any).code || SANDBOX_ERROR_CODES.HANDLER_EXECUTION_FAILED,
        message: errorObj.message,
        stack: errorObj.stack,
      },
    };
  }
}
