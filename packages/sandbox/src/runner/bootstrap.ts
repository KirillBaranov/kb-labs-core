/**
 * @module @kb-labs/sandbox/runner/bootstrap
 * Bootstrap script for subprocess sandbox execution
 * 
 * This script runs in a child process and handles:
 * - Loading and executing plugin handlers
 * - IPC communication with parent process
 * - Log interception and forwarding
 * - Error handling and reporting
 */

import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import * as path from 'node:path';
import type { HandlerRef, ExecutionContext } from '../types/index.js';
import type { SerializableContext } from './ipc-serializer.js';
import type { CliHandlerContext, RestHandlerContext } from '../types/adapter-context.js';
import { normalizeError } from '../errors/handler-error.js';
import { SANDBOX_ERROR_CODES } from '../errors/error-codes.js';
import { createSandboxOutput } from '../output/index.js';
import type { Output } from '@kb-labs/core-sys/output';

// Signal readiness IMMEDIATELY - before any other operations
// This must happen synchronously at module load time, RIGHT AFTER imports
// CRITICAL: Parent process is waiting for this message
if (process.send) {
  try {
    process.send({ type: 'READY' });
  } catch (e) {
    // If IPC fails, log to stderr (can't use Output yet - not initialized)
    // This is a critical error - parent will timeout
    console.error(`CRITICAL: Failed to send READY: ${e}`);
    // Exit immediately - parent will see exit code
    process.exit(1);
  }
}

// Check if debug mode is enabled (from environment or parent process)
const DEBUG_MODE = process.env.KB_PLUGIN_DEV_MODE === 'true' || process.env.DEBUG?.includes('@kb-labs');

// Create unified Output for sandbox
const sandboxOutput: Output = createSandboxOutput({
  verbosity: DEBUG_MODE ? 'debug' : 'normal',
  category: 'sandbox:bootstrap',
  format: 'human',
});

/**
 * Send LOG message to parent process via Output
 * Uses unified Output system instead of direct console manipulation
 */
function sendLog(level: 'info' | 'warn' | 'error' | 'debug', ...args: unknown[]): void {
  const message = args.map(a => String(a)).join(' ');
  
  // Use Output system which handles IPC automatically
  switch (level) {
    case 'error':
      sandboxOutput.error(message);
      break;
    case 'warn':
      sandboxOutput.warn(message);
      break;
    case 'debug':
      if (DEBUG_MODE) {
        sandboxOutput.debug(message);
      }
      break;
    default:
      sandboxOutput.info(message);
  }
}

/**
 * Intercept console methods to forward logs via IPC
 */
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

console.log = (...args: unknown[]) => {
  sendLog('info', ...args);
  // Don't call originalConsole.log here - sendLog already outputs to stdout
};

console.warn = (...args: unknown[]) => {
  sendLog('warn', ...args);
  // Don't call originalConsole.warn here - sendLog already outputs to stderr
};

console.error = (...args: unknown[]) => {
  sendLog('error', ...args);
  // Don't call originalConsole.error here - sendLog already outputs to stderr
};

console.debug = (...args: unknown[]) => {
  sendLog('debug', ...args);
  originalConsole.debug(...args);
};

/**
 * Recreate shims and adapter context from serialized context
 * Functions cannot be serialized via IPC, so we recreate them in subprocess
 */
function recreateContext(serializedCtx: SerializableContext): ExecutionContext {
  // Ensure pluginRoot is set (required)
  if (!serializedCtx || !serializedCtx.pluginRoot) {
    throw new Error('pluginRoot is required in SerializableContext');
  }
  
  // Defensive: ensure serializedCtx has all required fields
  const ctx: ExecutionContext = {
    requestId: serializedCtx.requestId || '',
    workdir: serializedCtx.workdir || '',
    outdir: serializedCtx.outdir,
    pluginRoot: serializedCtx.pluginRoot, // Required field
    pluginId: serializedCtx.pluginId || '',
    pluginVersion: serializedCtx.pluginVersion || '',
    traceId: serializedCtx.traceId,
    spanId: serializedCtx.spanId,
    parentSpanId: serializedCtx.parentSpanId,
    debug: serializedCtx.debug || false,
    debugLevel: serializedCtx.debugLevel, // Can be undefined, which is fine
    dryRun: serializedCtx.dryRun || false,
    user: serializedCtx.user,
    // Recreate functions as no-ops or IPC forwarders
    remainingMs: () => 0, // subprocess не знает о родительском timeout
    analytics: undefined, // не поддерживается в subprocess
    onLog: undefined, // логи идут через stdout/stderr
    signal: undefined, // cancellation через IPC
    resources: undefined, // cleanup в родительском процессе
    adapterMeta: serializedCtx.adapterMeta,
    version: serializedCtx.version,
  };
  
  // Validate context in debug mode (non-blocking, just log warnings)
  // Note: Validation is optional and skipped if module is not available
  if (process.env.KB_PLUGIN_DEV_MODE === 'true' || process.env.DEBUG?.includes('@kb-labs')) {
    // Try to validate context if validation module is available
    // This is optional and won't break if module is not available
    try {
      // Use dynamic import to avoid circular dependency and handle missing module gracefully
      void import('@kb-labs/plugin-runtime/context')
        .then((module) => {
          if (module?.validateExecutionContext && module?.formatValidationResult) {
            // Type assertion needed due to different ExecutionContext types between packages
            // Both packages have compatible ExecutionContext structures, so this is safe
            const validation = module.validateExecutionContext(ctx as Parameters<typeof module.validateExecutionContext>[0]);
            if (!validation.valid) {
              const formatted = module.formatValidationResult(validation);
              sandboxOutput.warn('Context validation warnings:\n' + formatted);
            }
          }
        })
        .catch(() => {
          // Ignore validation errors silently - module might not be available
        });
    } catch {
      // Ignore validation errors in production
    }
  }
  
  // Recreate adapter context if needed
  if (serializedCtx.adapterContextData) {
    const data = serializedCtx.adapterContextData;
    if (DEBUG_MODE) {
      sandboxOutput.debug(`adapterContextData received: type=${data.type}, hasFlags=${!!data.flags}`);
    }
    if (data.type === 'cli') {
      // Create Output for plugin in subprocess
      const pluginOutput = createSandboxOutput({
        verbosity: ctx.debug ? 'debug' : 'normal',
        category: `plugin:${ctx.pluginId || 'unknown'}`,
        format: 'human',
        context: {
          plugin: ctx.pluginId,
          command: ctx.adapterMeta?.signature === 'command' ? 'command' : undefined,
          trace: ctx.traceId,
        },
      });
      
      // Presenter в subprocess логирует через console/IPC (для обратной совместимости)
      ctx.adapterContext = {
        type: 'cli',
        output: pluginOutput,
        presenter: {
          write: (text: string) => pluginOutput.write(text),
          error: (text: string) => pluginOutput.error(text),
          info: (text: string) => pluginOutput.info(text),
          json: (data: unknown) => pluginOutput.json(data),
        },
        cwd: (data.cwd as string) || ctx.workdir,
        flags: (data.flags as Record<string, unknown>) || {},
        argv: (data.argv as string[]) || [],
        requestId: ctx.requestId,
        workdir: ctx.workdir,
        outdir: ctx.outdir,
        pluginId: ctx.pluginId,
        pluginVersion: ctx.pluginVersion,
        traceId: ctx.traceId,
        spanId: ctx.spanId,
        parentSpanId: ctx.parentSpanId,
        debug: ctx.debug,
      } as CliHandlerContext;
    } else if (data.type === 'rest') {
      ctx.adapterContext = {
        type: 'rest',
        request: data.request,
        requestId: ctx.requestId,
        workdir: ctx.workdir,
        outdir: ctx.outdir,
        pluginId: ctx.pluginId,
        pluginVersion: ctx.pluginVersion,
        traceId: ctx.traceId,
        spanId: ctx.spanId,
        parentSpanId: ctx.parentSpanId,
        debug: ctx.debug,
      } as RestHandlerContext;
    }
  }
  
  // Recreate extensions (only serializable data)
  if (serializedCtx.extensionsData) {
    ctx.extensions = {
      ...(ctx.extensions ?? {}),
      ...serializedCtx.extensionsData,
    };
  }
  
  return ctx;
}

/**
 * Load and execute handler
 */
async function executeHandler(
  handlerRef: HandlerRef,
  input: unknown,
  ctx: ExecutionContext
): Promise<{ ok: true; data: unknown } | { ok: false; error: { code: string; message: string; stack?: string } }> {
  try {
    // Resolve handler path
    // Handler file path from manifest (e.g., './cli/init#run')
    // Remove leading './' if present
    const handlerFile = handlerRef.file.replace(/^\.\//, '');
    
    // Get plugin root from context (required)
    if (!ctx.pluginRoot) {
      throw new Error('pluginRoot is required in ExecutionContext');
    }
    const pluginRoot = ctx.pluginRoot;
    
    // Try multiple paths:
    // 1. dist/cli/init.js (built file)
    // 2. cli/init.js (relative to pluginRoot)
    // 3. handler.file as-is
    // Note: handlerFile may already have .js extension, so check before adding
    const handlerFileExt = handlerFile.endsWith('.js') ? handlerFile : handlerFile + '.js';
    const distPath = path.join(pluginRoot, 'dist', handlerFileExt);
    const relativePath = path.join(pluginRoot, handlerFileExt);
    const directPath = path.resolve(pluginRoot, handlerRef.file.endsWith('.js') ? handlerRef.file : handlerRef.file + '.js');
    
    // Try to find which path exists
    const fs = await import('fs/promises');
    let finalHandlerPath: string;
    
    try {
      await fs.access(distPath);
      finalHandlerPath = distPath;
    } catch {
      try {
        await fs.access(relativePath);
        finalHandlerPath = relativePath;
      } catch {
        try {
          await fs.access(directPath);
          finalHandlerPath = directPath;
        } catch {
          // Fallback to dist path (will error if doesn't exist)
          finalHandlerPath = distPath;
        }
      }
    }
    
    // Convert to file:// URL for ES module import
    const handlerUrl = pathToFileURL(finalHandlerPath).href;
    
    // Load handler module
    let handlerModule: Record<string, unknown>;
    try {
      handlerModule = await import(handlerUrl) as Record<string, unknown>;
    } catch (importError: unknown) {
      const error = importError instanceof Error ? importError : new Error(String(importError));
      sandboxOutput.error(`Failed to import handler module: ${error.message}`, {
        code: SANDBOX_ERROR_CODES.HANDLER_IMPORT_FAILED,
      });
      if (error.stack) {
        sandboxOutput.debug(`Import error stack: ${error.stack}`);
      }
      throw error;
    }
    
    const handlerFn = handlerModule[handlerRef.export];
    
    if (!handlerFn || typeof handlerFn !== 'function') {
      const errorMsg = `Handler ${handlerRef.export} not found or not a function in ${handlerRef.file}`;
      sandboxOutput.error(errorMsg, {
        code: SANDBOX_ERROR_CODES.HANDLER_NOT_FOUND,
      });
      if (DEBUG_MODE) {
        sandboxOutput.debug(`Available exports: ${Object.keys(handlerModule).join(', ')}`);
      }
      throw new Error(errorMsg);
    }
    
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
        sandboxOutput.error(`Handler threw error: ${error instanceof Error ? error.message : String(error)}`, {
          code: SANDBOX_ERROR_CODES.HANDLER_EXECUTION_ERROR,
        });
        if (error instanceof Error && error.stack) {
          sandboxOutput.debug(`Error stack: ${error.stack}`);
        }
        throw error;
      }
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
        sandboxOutput.error(`Handler returned non-zero exit code: ${result}`, {
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
    sandboxOutput.error(`Handler execution failed: ${error instanceof Error ? error.message : String(error)}`, {
      code: SANDBOX_ERROR_CODES.HANDLER_EXECUTION_FAILED,
    });
    if (error instanceof Error && error.stack) {
      sandboxOutput.debug(`Stack trace: ${error.stack}`);
    }
    const normalizedError = normalizeError(error);
    return {
      ok: false,
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        stack: normalizedError.stack,
      },
    };
  }
}

/**
 * Handle RUN message from parent
 */
async function handleRunMessage(payload: {
  handlerRef: HandlerRef;
  input: unknown;
  ctx: SerializableContext | ExecutionContext;
}): Promise<void> {
  const { handlerRef, input, ctx: rawCtx } = payload;
  
  // Wrap everything in try-catch to ensure we ALWAYS send a response
  try {
    // Recreate context from serialized version if needed
    let ctx: ExecutionContext;
    try {
      ctx = 'adapterContext' in rawCtx 
        ? rawCtx as ExecutionContext
        : recreateContext(rawCtx as SerializableContext);
    } catch (contextError) {
      const err = contextError instanceof Error ? contextError : new Error(String(contextError));
      sandboxOutput.error(`Failed to recreate context: ${err.message}`, {
        code: SANDBOX_ERROR_CODES.CONTEXT_RECREATE_FAILED,
      });
      if (process.send) {
        process.send({
          type: 'ERR',
          payload: {
            code: 'CONTEXT_ERROR',
            message: `Failed to recreate context: ${err.message}`,
            stack: err.stack,
          },
        });
      }
      return;
    }
    
    // Execute handler with timeout protection
    let result: { ok: true; data: unknown } | { ok: false; error: { code: string; message: string; stack?: string } };
    try {
      result = await executeHandler(handlerRef, input, ctx);
    } catch (execError) {
      const err = execError instanceof Error ? execError : new Error(String(execError));
      sandboxOutput.error(`Handler execution failed: ${err.message}`, {
        code: SANDBOX_ERROR_CODES.HANDLER_EXECUTION_FAILED,
      });
      result = {
        ok: false,
        error: {
          code: 'HANDLER_EXECUTION_ERROR',
          message: err.message,
          stack: err.stack,
        },
      };
    }
    
    // Send result to parent
    if (!process.send) {
      sandboxOutput.error('process.send is not available, cannot send result', {
        code: SANDBOX_ERROR_CODES.IPC_UNAVAILABLE,
      });
      return;
    }
    
    try {
      if (result.ok) {
        process.send({
          type: 'OK',
          payload: {
            data: result.data,
          },
        });
      } else {
        sandboxOutput.debug(`Sending ERR message to parent: ${result.error.code} - ${result.error.message}`);
        process.send({
          type: 'ERR',
          payload: {
            code: result.error.code,
            message: result.error.message,
            stack: result.error.stack,
          },
        });
      }
    } catch (sendError) {
      // If sending fails, log but don't throw (process will exit anyway)
      sandboxOutput.error(`Failed to send result to parent: ${sendError instanceof Error ? sendError.message : String(sendError)}`, {
        code: SANDBOX_ERROR_CODES.IPC_SEND_FAILED,
      });
    }
  } catch (error) {
    // Final safety net - catch ANY unhandled error
    sandboxOutput.error(`Unhandled exception in handleRunMessage: ${error instanceof Error ? error.message : String(error)}`, {
      code: SANDBOX_ERROR_CODES.UNHANDLED_EXCEPTION,
    });
    if (error instanceof Error && error.stack) {
      sandboxOutput.debug(`Stack: ${error.stack}`);
    }
    
    // Try to send error to parent
    if (process.send) {
      try {
        const normalizedError = normalizeError(error);
        process.send({
          type: 'ERR',
          payload: {
            code: normalizedError.code,
            message: normalizedError.message,
            stack: normalizedError.stack,
          },
        });
      } catch (sendError) {
        // If even sending error fails, log and exit
        sandboxOutput.error(`Failed to send error to parent: ${sendError instanceof Error ? sendError.message : String(sendError)}`, {
          code: SANDBOX_ERROR_CODES.IPC_SEND_FAILED,
        });
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

/**
 * IPC message from parent process
 */
interface IpcMessage {
  type: 'RUN' | 'READY' | 'LOG' | 'ERR';
  payload?: {
    handlerRef?: HandlerRef;
    input?: unknown;
    ctx?: SerializableContext | ExecutionContext;
  };
}

/**
 * Listen for messages from parent process
 */
process.on('message', async (msg: unknown) => {
  try {
    const message = msg as IpcMessage;
    if (message?.type === 'RUN' && message.payload) {
      const payload = message.payload;
      // Validate required fields
      if (!payload.handlerRef || !payload.ctx) {
        sandboxOutput.error('Invalid RUN message: missing handlerRef or ctx', {
          code: SANDBOX_ERROR_CODES.INVALID_MESSAGE,
        });
        return;
      }
      sandboxOutput.debug(`Received RUN message, handler: ${payload.handlerRef.file}#${payload.handlerRef.export}`);
      await handleRunMessage({
        handlerRef: payload.handlerRef,
        input: payload.input,
        ctx: payload.ctx,
      });
    } else if (message?.type && message.type !== 'READY' && message.type !== 'LOG') {
      sandboxOutput.warn(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    const errorMsg = `Error handling message: ${error instanceof Error ? error.message : String(error)}`;
    sandboxOutput.error(errorMsg, {
      code: SANDBOX_ERROR_CODES.MESSAGE_HANDLER_ERROR,
    });
    if (error instanceof Error && error.stack) {
      sandboxOutput.debug(`Stack: ${error.stack}`);
    }
    // Send error back to parent
    if (process.send) {
      try {
        process.send({
          type: 'ERR',
          payload: {
            error: {
              code: 'BOOTSTRAP_ERROR',
              message: errorMsg,
              stack: error instanceof Error ? error.stack : undefined,
            },
          },
        });
      } catch {
        // Ignore if we can't send
      }
    }
  }
});

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error: Error) => {
  sandboxOutput.error(`Uncaught exception: ${error.message}`, {
    code: SANDBOX_ERROR_CODES.UNHANDLED_EXCEPTION,
  });
  if (process.send) {
    process.send({
      type: 'ERR',
      payload: {
        code: 'UNCAUGHT_EXCEPTION',
        message: error.message,
        stack: error.stack,
      },
    });
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  sandboxOutput.error(`Unhandled rejection: ${message}`, {
    code: SANDBOX_ERROR_CODES.UNHANDLED_REJECTION,
  });
  if (process.send) {
    process.send({
      type: 'ERR',
      payload: {
        code: 'UNHANDLED_REJECTION',
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
      },
    });
  }
  process.exit(1);
});

// Note: READY message is sent at the top of the file, immediately after imports
// This ensures parent process receives it before any initialization code runs

