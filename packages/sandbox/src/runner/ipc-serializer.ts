/**
 * @module @kb-labs/sandbox/runner/ipc-serializer
 * IPC-safe serialization for ExecutionContext
 * 
 * Functions and callbacks cannot be serialized via IPC, so we extract
 * only serializable data and recreate shims in the subprocess.
 */

import type { ExecutionContext } from '../types/index.js';
import type { AdapterMetadata } from '../types/adapter-context.js';

/**
 * Serializable subset of ExecutionContext
 * Contains only data that can be sent via IPC (no functions)
 */
export interface SerializableContext {
  requestId: string;
  workdir: string;
  outdir?: string;
  pluginRoot?: string;
  pluginId?: string;
  pluginVersion?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  debug?: boolean;
  debugLevel?: 'verbose' | 'inspect' | 'profile';
  dryRun?: boolean;
  user?: { id?: string };
  
  // Adapter metadata (serializable)
  adapterMeta?: AdapterMetadata;
  
  // Serialized adapter context (no functions)
  adapterContextData?: Record<string, unknown>;
  
  // Context version for compatibility checking
  version?: string;
  
  // Extension data (serializable only)
  extensionsData?: Record<string, unknown>;
}

/**
 * Serialize ExecutionContext to IPC-safe format
 * Extracts only serializable fields, excludes functions and callbacks
 */
export function serializeContext(ctx: ExecutionContext): SerializableContext {
  const serializable: SerializableContext = {
    requestId: ctx.requestId,
    workdir: ctx.workdir,
    outdir: ctx.outdir,
    pluginRoot: ctx.pluginRoot,
    pluginId: ctx.pluginId,
    pluginVersion: ctx.pluginVersion,
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    parentSpanId: ctx.parentSpanId,
    debug: ctx.debug,
    debugLevel: ctx.debugLevel,
    dryRun: ctx.dryRun,
    user: ctx.user,
    version: (ctx as any).version,
  };
  
  // Serialize adapter metadata
  if (ctx.adapterMeta) {
    serializable.adapterMeta = ctx.adapterMeta;
  }
  
  // Extract serializable data from adapter context
  if (ctx.adapterContext) {
    const adapterCtx = ctx.adapterContext as any;
    serializable.adapterContextData = {
      type: adapterCtx.type,
      // CLI-specific fields
      cwd: adapterCtx.cwd,
      flags: adapterCtx.flags,
      argv: adapterCtx.argv,
      // REST-specific fields
      request: adapterCtx.request ? {
        // Only serialize request metadata, not full request object
        method: adapterCtx.request.method,
        url: adapterCtx.request.url,
        headers: adapterCtx.request.headers,
      } : undefined,
    };
  }
  
  // Serialize extension data (only if it's serializable)
  if (ctx.extensions) {
    const extensionsData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(ctx.extensions)) {
      // Only include serializable values
      if (value !== null && typeof value !== 'function') {
        try {
          // Test if value is JSON-serializable
          JSON.stringify(value);
          extensionsData[key] = value;
        } catch {
          // Skip non-serializable values
        }
      }
    }
    if (ctx.extensions.events) {
      extensionsData.events = {
        hasLocal: Boolean((ctx.extensions.events as any).local),
        hasPlugin: Boolean((ctx.extensions.events as any).plugin),
        config: (ctx.extensions.events as any).config,
      };
    }
    if (Object.keys(extensionsData).length > 0) {
      serializable.extensionsData = extensionsData;
    }
  }
  
  return serializable;
}





