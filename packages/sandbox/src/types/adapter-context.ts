/**
 * @module @kb-labs/sandbox/types/adapter-context
 * Adapter-specific context types
 */

/**
 * Base context shared by all handlers
 */
export interface BaseHandlerContext {
  requestId: string;
  workdir: string;
  outdir?: string;
  pluginId?: string;
  pluginVersion?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  debug?: boolean;
}

/**
 * CLI-specific handler context
 */
export interface CliHandlerContext extends BaseHandlerContext {
  type: 'cli';
  presenter: {
    write: (text: string) => void;
    error: (text: string) => void;
    info: (text: string) => void;
    json: (data: any) => void;
  };
  cwd: string;
  flags: Record<string, any>;
  argv: string[];
}

/**
 * REST-specific handler context
 */
export interface RestHandlerContext extends BaseHandlerContext {
  type: 'rest';
  request?: any; // Fastify request or similar
}

/**
 * Union type for all adapter contexts
 */
export type HandlerContext = CliHandlerContext | RestHandlerContext;

/**
 * Adapter metadata
 */
export interface AdapterMetadata {
  /** Adapter type (extensible string, not enum) */
  type: string; // 'cli' | 'rest' | 'webhook' | 'graphql' | ...
  
  /** Handler signature type */
  signature: 'command' | 'request' | string; // extensible
  
  /** Adapter version (semver) */
  version: string; // '1.0.0'
  
  /** Adapter-specific metadata (extensible) */
  meta?: Record<string, unknown>;
}

/**
 * Type guards for adapter contexts
 */
export function isCliContext(ctx: HandlerContext): ctx is CliHandlerContext {
  return ctx.type === 'cli';
}

export function isRestContext(ctx: HandlerContext): ctx is RestHandlerContext {
  return ctx.type === 'rest';
}





