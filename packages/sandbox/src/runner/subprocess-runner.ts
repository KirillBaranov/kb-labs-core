/**
 * @module @kb-labs/sandbox/runner/subprocess-runner
 * Fork-based subprocess runner for isolation
 */

import { fork, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SandboxRunner } from './sandbox-runner.js';
import type {
  HandlerRef,
  ExecutionContext,
  ExecutionResult,
} from '../types/index.js';
import { pickEnv } from '../isolation/env-filter.js';
import { RingBuffer } from '../monitoring/log-collector.js';
import { collectMetrics } from '../monitoring/metrics-collector.js';
import { startTimeoutWatch, clearTimeoutWatch } from '../policies/execution-policy.js';
import type { SandboxConfig } from '../types/index.js';

/**
 * Setup log pipes for child process
 * @param child - Child process
 * @param ctx - Execution context
 * @param config - Sandbox configuration
 * @returns Ring buffer for log collection
 */
function setupLogPipes(
  child: ChildProcess,
  ctx: ExecutionContext,
  config: SandboxConfig
): RingBuffer {
  const bufferSizeMb = config.monitoring.logBufferSizeMb || 1;
  const ringBuffer = new RingBuffer(bufferSizeMb * 1024 * 1024);

  if (child.stdout) {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data: string) => {
      const lines = data.split('\n').filter((line) => line.trim());
      for (const line of lines) {
        ringBuffer.append(`[stdout] ${line}`);
      }
    });
  }

  if (child.stderr) {
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data: string) => {
      const lines = data.split('\n').filter((line) => line.trim());
      for (const line of lines) {
        ringBuffer.append(`[stderr] ${line}`);
      }
    });
  }

  // Handle IPC LOG messages
  child.on('message', (msg: any) => {
    if (msg?.type === 'LOG' && msg.payload) {
      const { level, message, meta } = msg.payload;
      const logLine = `[${level}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`;
      ringBuffer.append(logLine);
    }
  });

  return ringBuffer;
}

/**
 * Get bootstrap file path
 * In production, this will be the compiled .js file
 * Note: This is a placeholder - actual bootstrap needs to be implemented
 */
function getBootstrapPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // TODO: Implement actual bootstrap for sandbox
  // For now, return a placeholder path
  return path.join(__dirname, 'bootstrap.js');
}

/**
 * Create subprocess runner with fork-based isolation
 * @param config - Sandbox configuration
 * @returns SandboxRunner instance
 */
export function createSubprocessRunner(config: SandboxConfig): SandboxRunner {
  return {
    async run<TInput, TOutput>(
      handler: HandlerRef,
      input: TInput,
      ctx: ExecutionContext
    ): Promise<ExecutionResult<TOutput>> {
      const startedAt = Date.now();
      const cpuStart = process.cpuUsage();
      const memStart = process.memoryUsage().rss;

      // Get memory limit
      const memoryMb = config.execution.memoryMb;

      // Prepare environment (whitelisted only)
      const env = pickEnv(process.env as Record<string, string | undefined>, config.permissions.env.allow);
      env.START_TIME = String(startedAt);

      // Fork bootstrap process
      // TODO: Implement proper bootstrap script
      const child = fork(getBootstrapPath(), [], {
        execArgv: [
          `--max-old-space-size=${memoryMb}`,
          '--no-deprecation',
          '--enable-source-maps',
        ],
        env,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        cwd: ctx.workdir,
      });

      // Setup log collection
      const logBuffer = setupLogPipes(child, ctx, config);

      // Start timeout watch
      const timeoutMs = config.execution.timeoutMs;
      const graceMs = config.execution.graceMs;
      const timeoutHandle = startTimeoutWatch(child, timeoutMs, graceMs);

      // Send execution request
      child.send({
        type: 'RUN',
        payload: {
          handlerRef: handler,
          input,
          ctx,
        },
      });

      // Wait for result
      return new Promise<ExecutionResult<TOutput>>((resolve) => {
        const cleanup = () => {
          clearTimeoutWatch(timeoutHandle);
          if (!child.killed) {
            child.kill();
          }
        };

        child.on('message', (msg: any) => {
          if (msg?.type === 'OK' && msg.payload) {
            cleanup();
            const metrics = collectMetrics(startedAt, cpuStart, memStart);

            const result: ExecutionResult<TOutput> = {
              ok: true,
              data: msg.payload.data as TOutput,
              metrics,
            };

            // Include logs in debug mode
            if (ctx.debug && config.monitoring.collectLogs) {
              result.logs = logBuffer.getLines();
            }

            resolve(result);
          } else if (msg?.type === 'ERR' && msg.payload) {
            cleanup();
            const metrics = collectMetrics(startedAt, cpuStart, memStart);

            const result: ExecutionResult<TOutput> = {
              ok: false,
              error: {
                code: msg.payload.code || 'HANDLER_ERROR',
                message: msg.payload.message || 'Handler execution failed',
                stack: msg.payload.stack,
              },
              metrics,
            };

            // Include logs in debug mode
            if (ctx.debug && config.monitoring.collectLogs) {
              result.logs = logBuffer.getLines();
            }

            resolve(result);
          }
        });

        child.on('error', (error: Error) => {
          cleanup();
          const metrics = collectMetrics(startedAt, cpuStart, memStart);

          const result: ExecutionResult<TOutput> = {
            ok: false,
            error: {
              code: 'PROCESS_ERROR',
              message: error.message,
              stack: error.stack,
            },
            metrics,
          };

          // Include logs in debug mode
          if (ctx.debug && config.monitoring.collectLogs) {
            result.logs = logBuffer.getLines();
          }

          resolve(result);
        });

        child.on('exit', (code: number | null, signal: string | null) => {
          if (code !== 0 || signal) {
            cleanup();
            const metrics = collectMetrics(startedAt, cpuStart, memStart);

            const isTimeout = signal === 'SIGTERM' || signal === 'SIGKILL';
            const result: ExecutionResult<TOutput> = {
              ok: false,
              error: {
                code: isTimeout ? 'TIMEOUT' : 'PROCESS_EXIT',
                message: isTimeout
                  ? `Process killed by timeout (${timeoutMs}ms)`
                  : `Process exited with code ${code} (signal: ${signal})`,
              },
              metrics,
            };

            // Include logs in debug mode
            if (ctx.debug && config.monitoring.collectLogs) {
              result.logs = logBuffer.getLines();
            }

            resolve(result);
          }
        });
      });
    },

    async dispose(): Promise<void> {
      // Nothing to dispose for now
      // In future: cleanup any shared resources
    },
  };
}

