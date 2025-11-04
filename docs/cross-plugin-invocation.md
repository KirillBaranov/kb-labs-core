# Cross-Plugin Agent Invocation

## Overview

The cross-plugin invocation system enables plugins to securely invoke other plugins and access their artifacts. It uses a deny-by-default permission model with granular access control, isolated execution contexts, and broker-based access control.

## Key Concepts

### Permission Model

The permission system uses a strict priority order:

1. **DENY (explicit)** - Highest priority, always wins
2. **Routes allow** - If specified, only listed routes are allowed
3. **Plugins allow** - If specified, all routes from listed plugins are allowed
4. **Default DENY** - Lowest priority, nothing allowed by default

### Target Format

Canonical target format: `@pluginId@<semver>|latest:METHOD /path`

Examples:
- `@kb-labs/mind@^1.2.0:POST /query`
- `@kb-labs/github@latest:POST /pr/comment`
- `@kb-labs/audit@1.x:GET /status`

The registry performs semver matching against installed plugin versions.

### Chain Protection

The system enforces limits to prevent infinite loops and resource exhaustion:

- **maxDepth**: 8 (default) - Maximum chain depth (A→B→C→...→H)
- **maxFanOut**: 16 (default) - Maximum concurrent invocations from one plugin
- **maxChainTime**: Inherited from root quota - Total chain execution time

Violations trigger `E_PLUGIN_CHAIN_TIMEOUT` with context.

### Execution Isolation

Each cross-plugin invocation runs in an isolated sandbox:

- **Default**: New sandbox (child process) with isolated workdir/outdir
- **Chain tracking**: depth, fanOut, visited[] to prevent cycles
- **Session mounts**: Optional memory/volume mounts for data sharing
- **Quotas**: `remainingMs = min(caller.remainingMs, target.quotas.timeoutMs)`
- **Stricter-wins**: quotasOverride capped by both caller and target limits

### Artifact Access

Artifacts use logical addressing: `@pluginId/path/to/artifact.json`

- **Atomic writes**: Via temp file (.part) + rename
- **Metadata**: sha256, size, contentType, timestamps stored in `.meta.json`
- **ACL enforcement**: Read/write permissions validated before access
- **ContentType filtering**: Optional content type restrictions
- **FS bypass prevention**: Direct FS access to artifact directories is blocked

## Manifest Configuration

### Invoke Permissions

```typescript
{
  permissions: {
    invoke: {
      // Allow list of plugin IDs (all routes allowed)
      plugins: ['@kb-labs/mind', '@kb-labs/github'],
      
      // Allow list of specific routes (more restrictive)
      routes: [
        { target: '@kb-labs/mind:POST /query' },
        { target: '@kb-labs/github:POST /pr/comment' }
      ],
      
      // Deny list (overrides allow)
      deny: [
        { target: '@kb-labs/github:POST /pr/delete' }
      ]
    }
  }
}
```

**Permission Resolution Logic**:
1. If `deny` matches target → DENY
2. If `routes` specified and target not in routes → DENY
3. If `routes` specified and target in routes → ALLOW
4. If `plugins` specified and targetPlugin not in plugins → DENY
5. If `plugins` specified and targetPlugin in plugins → ALLOW
6. Otherwise → DENY (default)

### Artifact Permissions

```typescript
{
  permissions: {
    artifacts: {
      read: [
        {
          from: '@kb-labs/mind',
          paths: ['context/**'],
          allowedTypes: ['application/json'] // Optional
        }
      ],
      write: [
        {
          to: 'self',
          paths: ['out/**']
        }
      ]
    },
    // Block direct FS access to artifacts
    fs: {
      mode: 'readWrite',
      allow: ['tmp/**', 'out/**'],
      deny: ['**/.artifacts/**', '**/artifacts/**']
    }
  }
}
```

## Handler Usage

### Invoking Other Plugins

```typescript
export async function handle(input, ctx) {
  // Invoke another plugin
  const result = await ctx.runtime.invoke({
    target: '@kb-labs/mind@^1.2.0:POST /query',
    input: {
      query: 'impact',
      files: input.files
    },
    session: {
      traceId: ctx.traceId, // Propagate trace
      parentSpanId: ctx.spanId
    },
    quotasOverride: {
      timeoutMs: 8000 // Optional, capped by stricter policy
    },
    idempotencyKey: 'unique-key' // Optional, for retry safety
  });

  if (!result.ok) {
    // Handle error
    console.error('Invoke failed:', result.error);
    return { ok: false, error: result.error };
  }

  // Use result data
  const data = result.data;
  return { ok: true, data };
}
```

### Reading Artifacts

```typescript
export async function handle(input, ctx) {
  // Read artifact from another plugin
  const contextDoc = await ctx.runtime.artifacts.read({
    from: '@kb-labs/mind',
    path: 'context/12345.json',
    accept: ['application/json'] // Optional content type filter
  });

  // Parse if needed
  const context = typeof contextDoc === 'object' 
    ? contextDoc 
    : JSON.parse(contextDoc.toString());

  return { ok: true, context };
}
```

### Writing Artifacts

```typescript
export async function handle(input, ctx) {
  // Write artifact
  const { path, meta } = await ctx.runtime.artifacts.write({
    to: 'self',
    path: 'out/review/12345.json',
    data: {
      review: 'completed',
      findings: []
    },
    contentType: 'application/json',
    mode: 'upsert' // or 'failIfExists'
  });

  return { ok: true, artifactPath: path };
}
```

### Building Chains

```typescript
export async function handle(input, ctx) {
  // Step 1: Query mind
  const mindResult = await ctx.runtime.invoke({
    target: '@kb-labs/mind@^1.2.0:POST /query',
    input: { query: 'impact' },
    session: { traceId: ctx.traceId }
  });

  if (!mindResult.ok) {
    return mindResult;
  }

  // Step 2: Read context artifact
  const context = await ctx.runtime.artifacts.read({
    from: '@kb-labs/mind',
    path: `context/${mindResult.data.contextId}.json`
  });

  // Step 3: Process and write own artifact
  const review = processReview(context);
  
  await ctx.runtime.artifacts.write({
    to: 'self',
    path: `out/review/${input.pr}.json`,
    data: review
  });

  return { ok: true, review };
}
```

## Error Handling

### Error Codes

- `E_PLUGIN_INVOKE_DENIED` (403) - Invoke denied by policy
- `E_ARTIFACT_READ_DENIED` (403) - Artifact read denied
- `E_ARTIFACT_WRITE_DENIED` (403) - Artifact write denied
- `E_PLUGIN_ROUTE_NOT_FOUND` (404) - Route not found or version mismatch
- `E_PLUGIN_CHAIN_TIMEOUT` (504) - Chain limits exceeded

### Error Envelope Structure

```json
{
  "code": "E_PLUGIN_INVOKE_DENIED",
  "http": 403,
  "message": "Invoke to target denied by policy",
  "context": {
    "caller": "@kb-labs/ai-review",
    "target": "@kb-labs/mind@^1.2.0:POST /query",
    "reason": "route not allowed"
  },
  "remediation": "Add '@kb-labs/mind:POST /query' to permissions.invoke.routes in caller manifest"
}
```

### Error Handling Pattern

```typescript
export async function handle(input, ctx) {
  const result = await ctx.runtime.invoke({
    target: '@kb-labs/mind:POST /query',
    input: input
  });

  if (!result.ok) {
    // Check error code
    if (result.error.code === 'E_PLUGIN_INVOKE_DENIED') {
      // Permission denied - check remediation
      console.error('Denied:', result.error.details?.remediation);
      return { ok: false, error: 'Permission denied' };
    }
    
    if (result.error.code === 'E_PLUGIN_ROUTE_NOT_FOUND') {
      // Route not found - check available versions
      console.error('Not found:', result.error.context?.availableVersions);
      return { ok: false, error: 'Route not found' };
    }

    // Other errors
    return result;
  }

  return { ok: true, data: result.data };
}
```

## Quota Inheritance

### Remaining Timeout Calculation

The system calculates remaining timeout using the stricter-wins policy:

```typescript
remainingMs = min(
  caller.remainingMs - elapsed,
  target.manifest.quotas.timeoutMs,
  quotasOverride?.timeoutMs || Infinity
)
```

### Quota Override

```typescript
// Override only if allowed by policy
const result = await ctx.runtime.invoke({
  target: '@kb-labs/mind:POST /query',
  input: input,
  quotasOverride: {
    timeoutMs: 8000 // Capped by min(caller, target)
  }
});
```

## Tracing and Observability

### Trace Propagation

- **traceId**: Generated at root request, propagated through chain
- **spanId**: Generated per execution/invoke
- **parentSpanId**: Immediate caller's spanId

### Analytics Events

All cross-plugin invocations emit analytics events:

- `plugin.invoke.started` - Invocation started
- `plugin.invoke.finished` - Invocation completed
- `plugin.invoke.denied` - Invocation denied
- `artifact.read` - Artifact read
- `artifact.write` - Artifact written
- `artifact.read.denied` - Artifact read denied
- `artifact.write.denied` - Artifact write denied
- `plugin.fs.bypass.attempt` - FS bypass attempt (security event)

All events include:
- `traceId`, `spanId`, `parentSpanId` - Trace hierarchy
- `caller`, `target` - Plugin chain
- `depth`, `fanOut` - Chain metrics
- `requestId` - Root request

## Security Considerations

### Deny-by-Default

- No permissions = no access
- Explicit deny always wins
- Routes must be explicitly allowed

### Isolation

- Each invocation runs in isolated sandbox
- Separate workdir/outdir per invocation
- Quotas enforced per invocation

### Artifact Protection

- Direct FS access to artifact directories blocked
- Artifacts only accessible via ArtifactBroker
- ACL validated before every access

### Chain Protection

- Depth limits prevent infinite recursion
- Fan-out limits prevent resource exhaustion
- Cycle detection prevents circular dependencies

## Best Practices

### 1. Use Specific Route Permissions

Prefer specific routes over plugin-wide permissions:

```typescript
// Good: Specific routes
routes: [
  { target: '@kb-labs/mind:POST /query' }
]

// Less secure: All routes from plugin
plugins: ['@kb-labs/mind']
```

### 2. Handle Errors Gracefully

Always check `result.ok` and handle errors:

```typescript
const result = await ctx.runtime.invoke({ ... });
if (!result.ok) {
  // Log error with context
  ctx.runtime.log('error', 'Invoke failed', {
    error: result.error.code,
    target: result.error.context?.target
  });
  return result;
}
```

### 3. Use Idempotency Keys

For retry-safe operations:

```typescript
await ctx.runtime.invoke({
  target: '...',
  input: input,
  idempotencyKey: `review-${input.pr}-${input.sha}`
});
```

### 4. Propagate Trace Context

Always propagate traceId for observability:

```typescript
await ctx.runtime.invoke({
  target: '...',
  input: input,
  session: {
    traceId: ctx.traceId,
    parentSpanId: ctx.spanId
  }
});
```

### 5. Validate Artifact Content Types

Use content type filters when reading artifacts:

```typescript
const data = await ctx.runtime.artifacts.read({
  from: '@kb-labs/mind',
  path: 'context/123.json',
  accept: ['application/json']
});
```

## Migration Guide

### From Direct Plugin Calls

If you were calling plugins directly (not recommended), migrate to invoke:

```typescript
// Before (not secure)
const result = await callPlugin('@kb-labs/mind', 'query', input);

// After (secure)
const result = await ctx.runtime.invoke({
  target: '@kb-labs/mind@^1.2.0:POST /query',
  input: input
});
```

### Adding Permissions

Add invoke permissions to your manifest:

```typescript
{
  permissions: {
    invoke: {
      routes: [
        { target: '@kb-labs/mind:POST /query' }
      ]
    }
  }
}
```

### Artifact Access

If you were reading artifacts directly via FS, migrate to ArtifactBroker:

```typescript
// Before (blocked)
const data = await ctx.runtime.fs.readFile('artifacts/mind/context.json');

// After (secure)
const data = await ctx.runtime.artifacts.read({
  from: '@kb-labs/mind',
  path: 'context.json'
});
```

## Examples

### Complete Example: Review Chain

```typescript
export async function handle(input, ctx) {
  // 1. Invoke mind to get context
  const mindResult = await ctx.runtime.invoke({
    target: '@kb-labs/mind@^1.2.0:POST /query',
    input: {
      query: 'impact',
      files: input.files
    },
    session: {
      traceId: ctx.traceId
    }
  });

  if (!mindResult.ok) {
    return mindResult;
  }

  // 2. Read context artifact
  const context = await ctx.runtime.artifacts.read({
    from: '@kb-labs/mind',
    path: `context/${mindResult.data.contextId}.json`,
    accept: ['application/json']
  });

  // 3. Process review
  const review = await processReview(context, input);

  // 4. Write review artifact
  await ctx.runtime.artifacts.write({
    to: 'self',
    path: `out/review/${input.pr}.json`,
    data: review,
    contentType: 'application/json'
  });

  return {
    ok: true,
    reviewId: review.id,
    findings: review.findings
  };
}
```

### Manifest Example

```typescript
export default {
  schema: 'kb.plugin/2',
  id: '@kb-labs/ai-review',
  version: '1.2.0',
  permissions: {
    invoke: {
      plugins: ['@kb-labs/mind'],
      routes: [
        { target: '@kb-labs/mind:POST /query' }
      ]
    },
    artifacts: {
      read: [
        {
          from: '@kb-labs/mind',
          paths: ['context/**'],
          allowedTypes: ['application/json']
        }
      ],
      write: [
        {
          to: 'self',
          paths: ['out/**']
        }
      ]
    },
    quotas: {
      timeoutMs: 20000,
      memoryMb: 512
    }
  },
  rest: {
    basePath: '/v1/plugins/ai-review',
    routes: [
      {
        method: 'POST',
        path: '/review',
        handler: './rest/review.js#handle',
        input: { zod: './schemas/review.ts#ReviewInput' },
        output: { zod: './schemas/review.ts#ReviewOutput' }
      }
    ]
  }
};
```

## Troubleshooting

### Permission Denied

**Error**: `E_PLUGIN_INVOKE_DENIED`

**Solution**: Add target to `permissions.invoke.routes` or `permissions.invoke.plugins`

### Route Not Found

**Error**: `E_PLUGIN_ROUTE_NOT_FOUND`

**Solution**: Check version range and available versions in error context

### Chain Timeout

**Error**: `E_PLUGIN_CHAIN_TIMEOUT`

**Solution**: Reduce chain depth or increase timeout quota

### Artifact Access Denied

**Error**: `E_ARTIFACT_READ_DENIED` or `E_ARTIFACT_WRITE_DENIED`

**Solution**: Add artifact path to `permissions.artifacts.read` or `permissions.artifacts.write`

### FS Bypass Attempt

**Event**: `plugin.fs.bypass.attempt`

**Solution**: Use `ctx.runtime.artifacts.read/write()` instead of direct FS access

## API Reference

### `ctx.runtime.invoke(request: InvokeRequest): Promise<InvokeResult>`

Invoke another plugin.

**Parameters**:
- `target`: Canonical target string (`@pluginId@version:METHOD /path`)
- `input`: Optional input data
- `session`: Optional session context (traceId, parentSpanId, mounts)
- `quotasOverride`: Optional quota overrides
- `idempotencyKey`: Optional idempotency key

**Returns**: `InvokeResult<T>` with `ok`, `data`, or `error`

### `ctx.runtime.artifacts.read(request: ArtifactReadRequest): Promise<Buffer | object>`

Read artifact from another plugin.

**Parameters**:
- `from`: Plugin ID or 'self'
- `path`: Logical artifact path
- `accept`: Optional content type filter

**Returns**: Buffer or parsed object

### `ctx.runtime.artifacts.write(request: ArtifactWriteRequest): Promise<{ path: string, meta: ArtifactMeta }>`

Write artifact.

**Parameters**:
- `to`: Plugin ID or 'self'
- `path`: Logical artifact path
- `data`: Data to write
- `contentType`: Optional content type
- `mode`: 'upsert' or 'failIfExists'

**Returns**: Physical path and metadata

## See Also

- [ADR-0009: Cross-Plugin Invocation](./adr/0009-cross-plugin-invocation.md)
- [Plugin Manifest Schema](../packages/plugin-manifest/src/types.ts)
- [Error Codes](../../kb-labs-api-contracts/packages/api-contracts/src/errors.ts)

