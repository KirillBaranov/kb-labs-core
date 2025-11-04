/**
 * @module @kb-labs/plugin-runtime/execute
 * Handler execution wrapper with validation, quotas, and error handling
 */

import type {
  ManifestV2,
  SchemaRef,
  RestRouteDecl,
  CliCommandDecl,
} from '@kb-labs/plugin-manifest';
import type {
  ExecutionContext,
  ExecuteInput,
  ExecuteResult,
  HandlerRef,
} from './types.js';
import type { PluginRegistry } from './registry.js';
import type { InvokeBroker } from './invoke/broker.js';
import type { ArtifactBroker } from './artifacts/broker.js';
import type { ChainLimits, InvokeContext } from './invoke/types.js';
import { InvokeBroker as InvokeBrokerImpl } from './invoke/broker.js';
import { ArtifactBroker as ArtifactBrokerImpl } from './artifacts/broker.js';

/**
 * Parse handlerRef from string format (e.g., './rest/review.js#handle')
 * @param handlerRef - Handler reference string
 * @returns HandlerRef object
 */
function parseHandlerRef(handlerRef: string | HandlerRef): HandlerRef {
  if (typeof handlerRef === 'object') {
    return handlerRef;
  }
  const [file, exportName] = handlerRef.split('#');
  if (!exportName || !file) {
    throw new Error(`Handler reference must include export name: ${handlerRef}`);
  }
  return { file, export: exportName };
}
import { ErrorCode } from '@kb-labs/api-contracts';
import { checkCapabilities } from './capabilities.js';
import { emitAnalyticsEvent } from './analytics.js';
import { createSandboxRunner } from '@kb-labs/sandbox';
import { toErrorEnvelope, createErrorContext } from './errors.js';
import { createId } from './utils.js';
import { z } from 'zod';
import * as path from 'node:path';

/**
 * Resolve and validate schema from SchemaRef
 */
async function resolveSchema(
  schemaRef: SchemaRef | undefined,
  basePath: string
): Promise<z.ZodTypeAny | undefined> {
  if (!schemaRef) {
    return undefined;
  }

  if ('zod' in schemaRef) {
    // Zod schema reference: './schemas/review.ts#ReviewSchema'
    const [modulePath, exportName] = schemaRef.zod.split('#');
    if (!exportName || !modulePath) {
      throw new Error(
        `Schema reference must include export name: ${schemaRef.zod}`
      );
    }

    const resolvedPath = modulePath.startsWith('.')
      ? new URL(modulePath, `file://${basePath}/`).pathname
      : modulePath;

    const module = await import(resolvedPath);
    const schema = module[exportName];

    if (!schema || typeof schema.parse !== 'function') {
      throw new Error(
        `Schema ${exportName} not found or not a Zod schema in ${modulePath}`
      );
    }

    return schema as z.ZodTypeAny;
  }

  // OpenAPI $ref - for now, return undefined (validation happens at API level)
  return undefined;
}

/**
 * Validate input/output against schema
 */
function validateSchema<T>(
  data: unknown,
  schema: z.ZodTypeAny | undefined
): { valid: boolean; data?: T; errors?: z.ZodError } {
  if (!schema) {
    return { valid: true, data: data as T };
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data as T };
  }

  return { valid: false, errors: result.error };
}

/**
 * Validate input schema
 */
async function validateInput(
  manifest: ManifestV2,
  routeOrCommand: string,
  input: unknown,
  handlerRef: HandlerRef
): Promise<{ ok: boolean; errors?: z.ZodError }> {
  // Find route or command
  const handlerRefStr = `${handlerRef.file}#${handlerRef.export}`;
  const restRoute = manifest.rest?.routes.find(
    (r: RestRouteDecl) => r.handler === handlerRefStr
  );
  const cliCommand = manifest.cli?.commands.find(
    (c: CliCommandDecl) => c.handler === handlerRefStr
  );

  const inputSchemaRef = restRoute?.input || undefined;
  if (!inputSchemaRef) {
    return { ok: true };
  }

  const schema = await resolveSchema(inputSchemaRef, process.cwd());
  const validation = validateSchema(input, schema);

  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  return { ok: true };
}

/**
 * Validate output schema
 */
async function validateOutput(
  manifest: ManifestV2,
  routeOrCommand: string,
  output: unknown,
  handlerRef: HandlerRef
): Promise<{ ok: boolean; errors?: z.ZodError }> {
  // Find route or command
  const handlerRefStr = `${handlerRef.file}#${handlerRef.export}`;
  const restRoute = manifest.rest?.routes.find(
    (r: RestRouteDecl) => r.handler === handlerRefStr
  );
  const cliCommand = manifest.cli?.commands.find(
    (c: CliCommandDecl) => c.handler === handlerRefStr
  );

  const outputSchemaRef = restRoute?.output || undefined;
  if (!outputSchemaRef) {
    return { ok: true };
  }

  const schema = await resolveSchema(outputSchemaRef, process.cwd());
  const validation = validateSchema(output, schema);

  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  return { ok: true };
}

/**
 * Write artifacts if declared
 */
async function writeArtifactsIfAny(
  manifest: ManifestV2,
  ctx: ExecutionContext,
  data: unknown
): Promise<void> {
  if (!manifest.artifacts || manifest.artifacts.length === 0) {
    return;
  }

  const { writeArtifact } = await import('./artifacts.js');
  const { createId } = await import('./utils.js');

  for (const artifactDecl of manifest.artifacts) {
    try {
      const result = await writeArtifact(
        artifactDecl,
        data,
        {
          requestId: ctx.requestId,
          pluginId: ctx.pluginId,
          pluginVersion: ctx.pluginVersion,
          basePath: ctx.outdir || ctx.workdir,
          variables: {
            runId: ctx.requestId,
            profile: 'default',
          },
        }
      );

      if (result.success && result.path) {
        // Track artifact file for cleanup
        if (!ctx.tmpFiles) {
          ctx.tmpFiles = [];
        }
        ctx.tmpFiles.push(result.path);
      }
    } catch (error) {
      // Log error but don't fail execution
      console.error(
        `[${ctx.pluginId}] Failed to write artifact ${artifactDecl.id}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

/**
 * Execute handler with full runtime support
 */
/**
 * Execute handler with full runtime support
 * @param args - Execute input (supports both string and HandlerRef for handlerRef)
 * @param ctx - Execution context
 * @param registry - Optional plugin registry for cross-plugin invocation
 * @returns Execution result
 */
export async function execute(
  args: ExecuteInput,
  ctx: ExecutionContext,
  registry?: PluginRegistry
): Promise<ExecuteResult> {
  // HandlerRef is already in args.handler
  const handlerRef = args.handler;
  const startedAt = Date.now();

  // 1. Generate or inherit traceId
  const traceId = ctx.traceId || createId();

  // 2. Generate spanId for current execution
  const spanId = ctx.spanId || createId();

  // 3. Initialize chain limits
  const chainLimits: ChainLimits = ctx.chainLimits || {
    maxDepth: 8,
    maxFanOut: 16,
    maxChainTime: args.perms.quotas?.timeoutMs || 30000,
  };

  // 4. Initialize chain state
  const chainState: InvokeContext = ctx.chainState || {
    depth: 0,
    fanOut: 0,
    visited: [],
    remainingMs: args.perms.quotas?.timeoutMs || 30000,
  };

  // 5. Calculate remainingMs function
  const remainingMs = (): number => {
    const elapsed = Date.now() - startedAt;
    const initial = args.perms.quotas?.timeoutMs || 30000;
    return Math.max(0, initial - elapsed);
  };

  // 6. Initialize brokers if registry is provided
  let invokeBroker: InvokeBroker | undefined;
  let artifactBroker: ArtifactBroker | undefined;

  if (registry) {
    invokeBroker = new InvokeBrokerImpl(
      registry,
      args.manifest,
      ctx,
      chainLimits,
      chainState
    );

    artifactBroker = new ArtifactBrokerImpl(
      args.manifest,
      ctx,
      registry
    );
  }

  // 7. Update context with trace info
  const updatedCtx: ExecutionContext = {
    ...ctx,
    traceId,
    spanId,
    parentSpanId: ctx.parentSpanId,
    chainLimits,
    chainState,
    remainingMs,
  };

  // Emit started event
  await emitAnalyticsEvent('plugin.exec.started', {
    pluginId: ctx.pluginId,
    pluginVersion: ctx.pluginVersion,
    routeOrCommand: ctx.routeOrCommand,
    handlerRef: `${args.handler.file}#${args.handler.export}`,
    requestId: ctx.requestId,
    traceId,
    spanId,
    parentSpanId: ctx.parentSpanId,
    depth: chainState.depth,
  });

  try {
    // 1. Check capabilities (deny-by-default)
    const requiredCapabilities = args.manifest.capabilities || [];
    if (requiredCapabilities.length > 0) {
      const grantedCapabilities = args.perms.capabilities || [];
      const capabilityCheck = checkCapabilities(
        requiredCapabilities,
        grantedCapabilities
      );

      if (!capabilityCheck.granted) {
        const metrics = { timeMs: Date.now() - startedAt };
        const error = toErrorEnvelope(
          ErrorCode.PLUGIN_CAPABILITY_MISSING,
          403,
          {
            missing: capabilityCheck.missing,
            requested: requiredCapabilities,
            granted: grantedCapabilities,
            ...createErrorContext(
              ErrorCode.PLUGIN_CAPABILITY_MISSING,
              'capability.check',
              undefined,
              `Required: ${requiredCapabilities.join(', ')}, Granted: ${grantedCapabilities.join(', ')}`
            ),
          },
          ctx,
          metrics,
          args.perms
        );

        await emitAnalyticsEvent('plugin.permission.denied', {
          pluginId: ctx.pluginId,
          pluginVersion: ctx.pluginVersion,
          routeOrCommand: ctx.routeOrCommand,
          reason: 'capability_missing',
          missing: capabilityCheck.missing,
          requestId: ctx.requestId,
        });

        return {
          ok: false,
          error,
          metrics,
        };
      }
    }

    // 2. Validate input schema (if provided)
    const vin = await validateInput(
      args.manifest,
      ctx.routeOrCommand,
      args.input,
      args.handler
    );
    if (!vin.ok) {
      const metrics = { timeMs: Date.now() - startedAt };
      const error = toErrorEnvelope(
        ErrorCode.PLUGIN_SCHEMA_VALIDATION_FAILED,
        422,
        {
          where: 'input',
          errors: vin.errors?.issues || [],
        },
        ctx,
        metrics,
        args.perms
      );

      return {
        ok: false,
        error,
        metrics,
      };
    }

    // 3. Choose runner (MVP: subprocess, or in-process for dev mode)
    const devMode = ctx.debug || process.env.KB_PLUGIN_DEV_MODE === 'true';
    const runner = createSandboxRunner({
      execution: {
        timeoutMs: args.perms.quotas?.timeoutMs ?? 60000,
        graceMs: 5000,
        memoryMb: args.perms.quotas?.memoryMb ?? 512,
      },
      permissions: {
        env: { allow: args.perms.env?.allow || [] },
        filesystem: { allow: [], deny: [], readOnly: false },
        network: { allow: [], deny: [] },
        capabilities: args.perms.capabilities || [],
      },
      monitoring: {
        collectLogs: ctx.debug || false,
        collectMetrics: true,
        collectTraces: true,
        logBufferSizeMb: 1,
      },
      mode: devMode ? 'inprocess' : 'subprocess',
      devMode,
    });

    // 4. Run handler in sandbox
    const res = await runner.run({
      ctx: updatedCtx,
      perms: args.perms,
      handler: args.handler,
      input: args.input,
      manifest: args.manifest,
      invokeBroker,
      artifactBroker,
    });

    // 5. Output validation + artifacts
    if (res.ok) {
      const vout = await validateOutput(
        args.manifest,
        ctx.routeOrCommand,
        res.data,
        args.handler
      );
      if (!vout.ok) {
        const metrics = { ...res.metrics, timeMs: Date.now() - startedAt };
        const error = toErrorEnvelope(
          ErrorCode.PLUGIN_SCHEMA_VALIDATION_FAILED,
          422,
          {
            where: 'output',
            errors: vout.errors?.issues || [],
          },
          ctx,
          metrics,
          args.perms
        );

        await emitAnalyticsEvent('plugin.exec.failed', {
          pluginId: ctx.pluginId,
          pluginVersion: ctx.pluginVersion,
          routeOrCommand: ctx.routeOrCommand,
          reason: 'output_validation_failed',
          requestId: ctx.requestId,
          timeMs: metrics.timeMs,
        });

        return {
          ok: false,
          error,
          metrics,
        };
      }

      // Write artifacts (if declared)
      await writeArtifactsIfAny(args.manifest, ctx, res.data).catch((err) => {
        emitAnalyticsEvent('plugin.artifact.failed', {
          pluginId: ctx.pluginId,
          pluginVersion: ctx.pluginVersion,
          routeOrCommand: ctx.routeOrCommand,
          requestId: ctx.requestId,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      await emitAnalyticsEvent('plugin.exec.finished', {
        pluginId: ctx.pluginId,
        pluginVersion: ctx.pluginVersion,
        routeOrCommand: ctx.routeOrCommand,
        requestId: ctx.requestId,
        timeMs: res.metrics.timeMs,
        cpuMs: res.metrics.cpuMs,
        memMb: res.metrics.memMb,
      });

      return res;
    } else {
      await emitAnalyticsEvent('plugin.exec.failed', {
        pluginId: ctx.pluginId,
        pluginVersion: ctx.pluginVersion,
        routeOrCommand: ctx.routeOrCommand,
        reason: 'handler_error',
        requestId: ctx.requestId,
        errorCode: res.error.code,
        timeMs: res.metrics.timeMs,
      });

      return res;
    }
  } catch (error) {
    const timeMs = Date.now() - startedAt;
    const metrics = { timeMs };

    const errorEnvelope = toErrorEnvelope(
      ErrorCode.INTERNAL,
      500,
      {
        error: error instanceof Error ? error.message : String(error),
      },
      ctx,
      metrics,
      args.perms
    );

    await emitAnalyticsEvent('plugin.exec.failed', {
      pluginId: ctx.pluginId,
      pluginVersion: ctx.pluginVersion,
      routeOrCommand: ctx.routeOrCommand,
      reason: 'execution_error',
      requestId: ctx.requestId,
      timeMs,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      error: errorEnvelope,
      metrics,
    };
  }
}
