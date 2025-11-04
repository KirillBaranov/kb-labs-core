/**
 * @module @kb-labs/sandbox/runner/inprocess-runner
 * In-process runner for dev mode (no isolation)
 */

import * as path from 'node:path';
import type { SandboxRunner } from './sandbox-runner.js';
import type {
  HandlerRef,
  ExecutionContext,
  ExecutionResult,
} from '../types/index.js';
import { collectMetrics } from '../monitoring/metrics-collector.js';

/**
 * Create in-process runner (dev mode - no sandbox)
 * WARNING: No isolation! Use only for development.
 * @returns SandboxRunner instance
 */
export function createInProcessRunner(): SandboxRunner {
  return {
    async run<TInput, TOutput>(
      handler: HandlerRef,
      input: TInput,
      ctx: ExecutionContext
    ): Promise<ExecutionResult<TOutput>> {
      const startedAt = Date.now();
      const cpuStart = process.cpuUsage();
      const memStart = process.memoryUsage().rss;

      // Create log buffer for dev mode
      const devLogs: string[] = [];

      try {
        // In dev mode, load handler directly (no sandbox)
        const handlerPath = path.resolve(process.cwd(), handler.file);
        const handlerModule = await import(handlerPath);
        const handlerFn = handlerModule[handler.export];

        if (!handlerFn || typeof handlerFn !== 'function') {
          throw new Error(
            `Handler ${handler.export} not found or not a function in ${handler.file}`
          );
        }

        // Execute handler directly
        const result = await handlerFn(input, {
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

        const metrics = collectMetrics(startedAt, cpuStart, memStart);

        const executeResult: ExecutionResult<TOutput> = {
          ok: true,
          data: result as TOutput,
          metrics,
        };

        // Include logs in debug mode
        if (ctx.debug) {
          executeResult.logs = devLogs;
        }

        return executeResult;
      } catch (error) {
        const metrics = collectMetrics(startedAt, cpuStart, memStart);

        const executeResult: ExecutionResult<TOutput> = {
          ok: false,
          error: {
            code: 'HANDLER_ERROR',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          metrics,
        };

        // Include logs in debug mode
        if (ctx.debug) {
          executeResult.logs = devLogs;
        }

        return executeResult;
      }
    },

    async dispose(): Promise<void> {
      // Nothing to dispose in in-process mode
    },
  };
}

