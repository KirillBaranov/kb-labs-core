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

// Check if debug mode is enabled (from environment or parent process)
const DEBUG_MODE = process.env.KB_PLUGIN_DEV_MODE === 'true' || process.env.DEBUG?.includes('@kb-labs');

/**
 * Send LOG message to parent process
 * Always sends via IPC for log collection, and outputs to stdout/stderr
 * Parent process controls visibility via --quiet flag
 * Debug messages only shown in DEBUG_MODE
 */
function sendLog(level: 'info' | 'warn' | 'error' | 'debug', ...args: unknown[]): void {
  const message = args.map(a => String(a)).join(' ');
  
  // Send via IPC for log collection in parent process
  if (process.send) {
    try {
      process.send({
        type: 'LOG',
        payload: {
          level,
          message,
          meta: {},
        },
      });
    } catch (e) {
      // Ignore IPC errors silently
    }
  }
  
  // Output directly to stdout/stderr
  // Parent process controls visibility via --quiet flag
  // Debug messages only shown in DEBUG_MODE
  if (level === 'error') {
    originalConsole.error(message);
  } else if (level === 'warn') {
    originalConsole.warn(message);
  } else if (level === 'debug') {
    // Only show debug messages in DEBUG_MODE
    if (DEBUG_MODE) {
      originalConsole.log(message);
    }
  } else {
    // info level - always show
    originalConsole.log(message);
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
  if (!serializedCtx.pluginRoot) {
    throw new Error('pluginRoot is required in SerializableContext');
  }
  
  const ctx: ExecutionContext = {
    ...serializedCtx,
    pluginRoot: serializedCtx.pluginRoot, // Required field
    // Recreate functions as no-ops or IPC forwarders
    remainingMs: () => 0, // subprocess не знает о родительском timeout
    analytics: undefined, // не поддерживается в subprocess
    onLog: undefined, // логи идут через stdout/stderr
    signal: undefined, // cancellation через IPC
    resources: undefined, // cleanup в родительском процессе
  };
  
  // Recreate adapter context if needed
  if (serializedCtx.adapterContextData) {
    const data = serializedCtx.adapterContextData;
    if (data.type === 'cli') {
      // Presenter в subprocess логирует через console/IPC
      ctx.adapterContext = {
        type: 'cli',
        presenter: {
          write: (text: string) => console.log(text),
          error: (text: string) => console.error(text),
          info: (text: string) => console.log(text),
          json: (data: any) => console.log(JSON.stringify(data)),
        },
        cwd: data.cwd as string,
        flags: data.flags as Record<string, any>,
        argv: data.argv as string[],
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
  sendLog('debug', `[BOOTSTRAP] executeHandler called - handler: ${handlerRef.file}#${handlerRef.export}`);
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
    
    sendLog('debug', `[BOOTSTRAP] Loading handler module from: ${finalHandlerPath}`);
    sendLog('debug', `[BOOTSTRAP] Handler URL: ${handlerUrl}`);
    
    // Load handler module
    let handlerModule: any;
    try {
      sendLog('debug', '[BOOTSTRAP] Starting import...');
      handlerModule = await import(handlerUrl);
      sendLog('debug', `[BOOTSTRAP] Module imported successfully, exports: ${Object.keys(handlerModule).join(', ')}`);
    } catch (importError: any) {
      sendLog('error', `[BOOTSTRAP] Failed to import handler module: ${importError.message}`);
      if (importError.stack) {
        sendLog('error', `[BOOTSTRAP] Import error stack: ${importError.stack}`);
      }
      throw importError;
    }
    
    sendLog('debug', `[BOOTSTRAP] Looking for handler export: ${handlerRef.export}`);
    const handlerFn = handlerModule[handlerRef.export];
    
    if (!handlerFn || typeof handlerFn !== 'function') {
      const errorMsg = `Handler ${handlerRef.export} not found or not a function in ${handlerRef.file}`;
      sendLog('error', `[BOOTSTRAP] ${errorMsg}`);
      sendLog('error', `[BOOTSTRAP] Available exports: ${Object.keys(handlerModule).join(', ')}`);
      throw new Error(errorMsg);
    }
    
    sendLog('debug', '[BOOTSTRAP] Handler function found, preparing to execute...');
    
    // Execute handler based on adapter signature
    let result: unknown;
    const adapterMeta = ctx.adapterMeta;
    
    if (adapterMeta?.signature === 'command' && ctx.adapterContext?.type === 'cli') {
      // CLI command signature: (ctx, argv, flags)
      const cmdCtx = ctx.adapterContext as CliHandlerContext;
      result = await handlerFn(cmdCtx, cmdCtx.argv, cmdCtx.flags);
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
    
    sendLog('debug', `[BOOTSTRAP] Handler executed successfully, result type: ${typeof result}`);
    
    // Handle numeric exit codes (CLI handlers return numbers)
    if (typeof result === 'number') {
      sendLog('debug', `[BOOTSTRAP] Handler returned exit code: ${result}`);
      if (result === 0) {
        return { ok: true, data: result };
      } else {
        sendLog('error', `[BOOTSTRAP] Handler returned non-zero exit code: ${result}`);
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
    
    sendLog('debug', `[BOOTSTRAP] Returning success result`);
    return { ok: true, data: result };
  } catch (error) {
    sendLog('error', `[BOOTSTRAP] Handler execution failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      sendLog('error', `[BOOTSTRAP] Stack trace: ${error.stack}`);
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
  sendLog('debug', '[BOOTSTRAP] handleRunMessage called');
  const { handlerRef, input, ctx: rawCtx } = payload;
  
  try {
    sendLog('debug', '[BOOTSTRAP] Recreating context...');
    // Recreate context from serialized version if needed
    const ctx = 'adapterContext' in rawCtx 
      ? rawCtx as ExecutionContext
      : recreateContext(rawCtx as SerializableContext);
    
    sendLog('debug', `[BOOTSTRAP] Context recreated, pluginRoot: ${ctx.pluginRoot}`);
    sendLog('debug', '[BOOTSTRAP] Calling executeHandler...');
    const result = await executeHandler(handlerRef, input, ctx);
    
    sendLog('debug', `[BOOTSTRAP] executeHandler returned, ok: ${result.ok}`);
    
    if (result.ok) {
      sendLog('debug', '[BOOTSTRAP] Sending OK message to parent');
      process.send!({
        type: 'OK',
        payload: {
          data: result.data,
        },
      });
    } else {
      sendLog('error', `[BOOTSTRAP] Sending ERR message to parent: ${result.error.code} - ${result.error.message}`);
      process.send!({
        type: 'ERR',
        payload: {
          code: result.error.code,
          message: result.error.message,
          stack: result.error.stack,
        },
      });
    }
  } catch (error) {
    sendLog('error', `[BOOTSTRAP] Exception in handleRunMessage: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      sendLog('error', `[BOOTSTRAP] Stack: ${error.stack}`);
    }
    const normalizedError = normalizeError(error);
    process.send!({
      type: 'ERR',
      payload: {
        code: normalizedError.code,
        message: normalizedError.message,
        stack: normalizedError.stack,
      },
    });
  }
}

/**
 * Listen for messages from parent process
 */
process.on('message', async (msg: any) => {
  sendLog('debug', `[BOOTSTRAP] Received message: ${msg?.type || 'unknown'}`);
  if (msg?.type === 'RUN' && msg.payload) {
    sendLog('debug', `[BOOTSTRAP] Handling RUN message for handler: ${msg.payload.handlerRef?.file}#${msg.payload.handlerRef?.export}`);
    await handleRunMessage(msg.payload);
  } else {
    sendLog('warn', `[BOOTSTRAP] Unknown message type: ${msg?.type || 'undefined'}`);
  }
});

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error: Error) => {
  sendLog('error', `Uncaught exception: ${error.message}`);
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
  sendLog('error', `Unhandled rejection: ${message}`);
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

// Signal readiness
sendLog('debug', '[BOOTSTRAP] Process started, preparing to send READY');
if (process.send) {
  try {
    sendLog('debug', '[BOOTSTRAP] Sending READY message');
    process.send({ type: 'READY' });
    sendLog('debug', '[BOOTSTRAP] READY message sent');
  } catch (e) {
    sendLog('error', `[BOOTSTRAP] Failed to send READY: ${e}`);
  }
} else {
  // Log to stderr if IPC is not available
  sendLog('error', '[BOOTSTRAP] WARNING: process.send is not available');
}

