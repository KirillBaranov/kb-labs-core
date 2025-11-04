# How the Cross-Plugin Invocation System Works

## Complete Flow Overview

### 1. Entry Point (CLI or REST)

#### CLI:
```typescript
// plugin-adapter-cli/src/handler.ts
export async function executeCommand(
  command: CliCommandDecl,
  manifest: ManifestV2,
  ...
  registry?: PluginRegistry  // ← Plugin registry is passed
) {
  // 1. Generate root traceId
  const traceId = createId();
  
  // 2. Create execution context
  const execCtx = {
    requestId: createId(),
    pluginId: manifest.id,
    traceId,  // ← traceId in context
    ...
  };
  
  // 3. Call runtime.execute with registry
  const result = await runtimeExecute(
    { handler, input, manifest, perms },
    execCtx,
    registry  // ← Pass registry
  );
}
```

#### REST:
```typescript
// plugin-adapter-rest/src/handler.ts
export async function executeRoute(
  route: RestRouteDecl,
  manifest: ManifestV2,
  request: FastifyRequest,
  ...
  registry?: PluginRegistry  // ← Plugin registry is passed
) {
  // 1. Extract or generate traceId
  const traceId = request.headers['x-trace-id'] || createId();
  
  // 2. Create execution context
  const execCtx = {
    requestId: request.id || createId(),
    pluginId: manifest.id,
    traceId,  // ← traceId in context
    ...
  };
  
  // 3. Call runtime.execute with registry
  const result = await runtimeExecute(
    { handler, input, manifest, perms },
    execCtx,
    registry  // ← Pass registry
  );
}
```

### 2. Initialization in execute.ts

```typescript
// plugin-runtime/src/execute.ts
export async function execute(
  args: ExecuteInput,
  ctx: ExecutionContext,
  registry?: PluginRegistry  // ← Optional registry
) {
  // 1. Generate/inherit traceId
  const traceId = ctx.traceId || createId();
  
  // 2. Generate spanId for current execution
  const spanId = ctx.spanId || createId();
  
  // 3. Initialize chain limits (recursion protection)
  const chainLimits: ChainLimits = {
    maxDepth: 8,
    maxFanOut: 16,
    maxChainTime: perms.quotas?.timeoutMs || 30000,
  };
  
  // 4. Initialize chain state (depth tracking)
  const chainState: InvokeContext = {
    depth: 0,
    fanOut: 0,
    visited: [],
    remainingMs: perms.quotas?.timeoutMs || 30000,
  };
  
  // 5. Function to calculate remaining time
  const remainingMs = (): number => {
    const elapsed = Date.now() - startedAt;
    return Math.max(0, initialTimeout - elapsed);
  };
  
  // 6. ⭐ INITIALIZE BROKERS (if registry is provided)
  let invokeBroker: InvokeBroker | undefined;
  let artifactBroker: ArtifactBroker | undefined;
  
  if (registry) {
    // Create InvokeBroker for cross-plugin invocations
    invokeBroker = new InvokeBrokerImpl(
      registry,
      args.manifest,
      ctx,
      chainLimits,
      chainState
    );
    
    // Create ArtifactBroker for artifact management
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
  
  // 8. Check capabilities, validate input/output...
  
  // 9. Run handler in sandbox
  const runner = nodeSubprocRunner(devMode);
  const res = await runner.run({
    ctx: updatedCtx,
    perms: args.perms,
    handler: args.handler,
    input: args.input,
    manifest: args.manifest,
    invokeBroker,      // ← Pass brokers to runner
    artifactBroker,    // ← Pass brokers to runner
  });
}
```

### 3. Runner creates isolated sandbox

```typescript
// plugin-runtime/src/sandbox/node-subproc.ts
export function createInProcessRunner(): SandboxRunner {
  return {
    async run(args) {
      // 1. Load handler module
      const handlerModule = await import(handlerPath);
      const handlerFn = handlerModule[handlerRef.export];
      
      // 2. Filter env by permissions
      const env = pickEnv(perms.env, process.env);
      
      // 3. ⭐ BUILD RUNTIME with brokers
      const runtime = buildRuntime(
        perms,
        ctx,
        env,
        args.manifest,
        args.invokeBroker,    // ← Pass InvokeBroker
        args.artifactBroker  // ← Pass ArtifactBroker
      );
      
      // 4. Call handler with runtime context
      const result = await handlerFn(input, {
        requestId: ctx.requestId,
        pluginId: ctx.pluginId,
        traceId: ctx.traceId,      // ← traceId available
        spanId: ctx.spanId,        // ← spanId available
        parentSpanId: ctx.parentSpanId,
        runtime: {
          fetch,
          fs,
          env,
          log,
          invoke: runtime.invoke,           // ← invoke API available
          artifacts: runtime.artifacts,    // ← artifacts API available
        },
      });
      
      return { ok: true, data: result };
    }
  };
}
```

### 4. buildRuntime creates API for handler

```typescript
// plugin-runtime/src/sandbox/child/runtime.ts
export function buildRuntime(
  perms: PermissionSpec,
  ctx: ExecutionContext,
  env: NodeJS.ProcessEnv,
  manifest: ManifestV2,
  invokeBroker?: InvokeBroker,      // ← Optional InvokeBroker
  artifactBroker?: ArtifactBroker   // ← Optional ArtifactBroker
) {
  // Create standard APIs (fetch, fs, env, log)
  const fetch = createWhitelistedFetch(perms.net);
  const fs = createFsShim(perms.fs, ctx.workdir, ctx.outdir, ctx);
  const envAccessor = createEnvAccessor(perms.env?.allow, env);
  const log = (level, msg, meta) => { /* IPC logging */ };
  
  // ⭐ CREATE INVOKE API
  const invoke = async <T = unknown>(
    request: InvokeRequest
  ): Promise<InvokeResult<T>> => {
    if (!invokeBroker) {
      throw new Error('Invoke broker not available');
    }
    return invokeBroker.invoke<T>(request);
  };
  
  // ⭐ CREATE ARTIFACTS API
  const artifacts = {
    read: async (request: ArtifactReadRequest): Promise<Buffer | object> => {
      if (!artifactBroker) {
        throw new Error('Artifact broker not available');
      }
      return artifactBroker.read(request);
    },
    write: async (request: ArtifactWriteRequest): Promise<{ path: string; meta: ArtifactMeta }> => {
      if (!artifactBroker) {
        throw new Error('Artifact broker not available');
      }
      return artifactBroker.write(request);
    },
  };
  
  return {
    fetch,
    fs,
    env: envAccessor,
    log,
    invoke,      // ← Available in handler
    artifacts,   // ← Available in handler
  };
}
```

### 5. Handler uses API

```typescript
// Example: mind-cli/src/cli/pack-handler.ts
export async function run(input, ctx) {
  // 1. Execute main logic
  const result = await buildPack({ ... });
  
  // 2. ⭐ WRITE ARTIFACT via artifacts API
  if (ctx.runtime.artifacts) {
    const artifactResult = await ctx.runtime.artifacts.write({
      to: 'self',
      path: '.kb/mind/pack/default/latest.md',
      data: result.markdown,
      contentType: 'text/markdown',
      mode: 'upsert',
    });
    packPath = artifactResult.path;
  } else {
    // Fallback to direct FS (for backward compatibility)
    await ctx.runtime.fs.writeFile(path, result.markdown);
  }
  
  return { ok: true, packPath };
}
```

### 6. InvokeBroker handles cross-plugin invocations

```typescript
// plugin-runtime/src/invoke/broker.ts
export class InvokeBroker {
  async invoke<T = unknown>(request: InvokeRequest): Promise<InvokeResult<T>> {
    // 1. Normalize target: @pluginId@version:METHOD /path
    const resolved = this.resolveTarget(request.target);
    
    // 2. Check chain limits (depth, fanOut, visited)
    this.checkChainLimits(resolved.pluginId);
    
    // 3. ⭐ CHECK PERMISSIONS for invocation
    const permissionCheck = resolveInvokeDecision(
      this.callerManifest.permissions?.invoke,
      { pluginId, method, path }
    );
    
    if (!permissionCheck.allow) {
      throw toErrorEnvelope(E_PLUGIN_INVOKE_DENIED, ...);
    }
    
    // 4. Calculate remaining timeout
    const remainingMs = Math.min(
      this.chainState.remainingMs,
      targetManifest.quotas.timeoutMs
    );
    
    // 5. Create new isolated context for target
    const targetCtx: ExecutionContext = {
      ...this.callerCtx,
      traceId: request.session?.traceId || this.callerCtx.traceId,
      spanId: createId(),
      parentSpanId: this.callerCtx.spanId,  // ← Span chain
      depth: this.chainState.depth + 1,
      remainingMs: () => remainingMs,
    };
    
    // 6. ⭐ INVOKE TARGET PLUGIN via runtime.execute
    const result = await runtimeExecute(
      {
        handler: resolved.handlerRef,
        input: request.input,
        manifest: targetManifest,
        perms: targetManifest.permissions,
      },
      targetCtx,
      this.registry  // ← Pass registry further
    );
    
    return { ok: true, data: result.data };
  }
}
```

### 7. ArtifactBroker manages artifacts

```typescript
// plugin-runtime/src/artifacts/broker.ts
export class ArtifactBroker {
  async write(request: ArtifactWriteRequest): Promise<{ path: string; meta: ArtifactMeta }> {
    // 1. ⭐ CHECK PERMISSIONS for write
    const permissionCheck = this.checkWritePermission(request);
    if (!permissionCheck.allow) {
      throw toErrorEnvelope(E_ARTIFACT_WRITE_DENIED, ...);
    }
    
    // 2. Convert logical path to physical
    // Logical: '.kb/mind/pack/latest.md'
    // Physical: '.artifacts/@kb-labs/mind/.kb/mind/pack/latest.md'
    const physicalPath = this.resolvePath(request.to, request.path);
    
    // 3. Atomic write: temp → rename
    const tmpPath = `${physicalPath}.${Date.now()}.part`;
    await fs.writeFile(tmpPath, data);
    
    // 4. Calculate metadata (sha256, size, contentType)
    const meta: ArtifactMeta = {
      owner: this.callerCtx.pluginId,
      size: buffer.length,
      sha256: hash(buffer),
      contentType: request.contentType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // 5. Save metadata
    await fs.writeFile(`${tmpPath}.meta.json`, JSON.stringify(meta));
    
    // 6. Atomic rename
    await fs.rename(tmpPath, physicalPath);
    await fs.rename(`${tmpPath}.meta.json`, `${physicalPath}.meta.json`);
    
    return { path: physicalPath, meta };
  }
  
  async read(request: ArtifactReadRequest): Promise<Buffer | object> {
    // 1. ⭐ CHECK PERMISSIONS for read
    const permissionCheck = this.checkReadPermission(request);
    if (!permissionCheck.allow) {
      throw toErrorEnvelope(E_ARTIFACT_READ_DENIED, ...);
    }
    
    // 2. Convert logical path to physical
    const physicalPath = this.resolvePath(request.from, request.path);
    
    // 3. Read data
    const data = await fs.readFile(physicalPath);
    
    // 4. Check contentType if accept is specified
    const meta = await this.readMeta(physicalPath);
    if (request.accept && !request.accept.includes(meta.contentType)) {
      throw toErrorEnvelope(E_ARTIFACT_READ_DENIED, ...);
    }
    
    return data;
  }
}
```

## Key Points

### 1. Conditional broker initialization
- Brokers are created **only if `registry` is passed**
- If `registry` is not passed → brokers are `undefined` → APIs are unavailable
- This allows operation in mode without cross-plugin invocations

### 2. Tracing
- `traceId` is generated on root request (CLI/REST)
- Each `execute()` creates a new `spanId`
- On `invoke()` a new `spanId` is created with `parentSpanId = caller.spanId`
- All analytics events include `traceId`, `spanId`, `parentSpanId`, `depth`

### 3. Chain protection
- `ChainLimits`: maxDepth=8, maxFanOut=16, maxChainTime
- `InvokeContext`: depth, fanOut, visited[], remainingMs
- On exceeding limits → `E_PLUGIN_CHAIN_TIMEOUT`

### 4. Isolation
- Each `invoke()` runs in a new sandbox
- New `workdir`/`outdir` for each invocation
- Quotas calculated as `min(caller.remainingMs, target.quotas.timeoutMs)`

### 5. Permissions
- **Invoke**: deny → routes allow → plugins allow → default deny
- **Artifacts**: ACL check before each read/write
- Direct FS access to `.artifacts/**` is blocked

### 6. Backward compatibility
- Handlers check for `ctx.runtime.artifacts` before using
- If API is unavailable → fallback to direct FS
- This allows operation without registry

## Complete flow example

```
1. CLI: kb mind pack -i "demo"
   ↓
2. plugin-adapter-cli: executeCommand()
   - Generates traceId
   - Creates execCtx
   - Calls runtimeExecute(..., registry)
   ↓
3. plugin-runtime: execute()
   - Generates spanId
   - Initializes InvokeBroker and ArtifactBroker (if registry)
   - Updates ctx with trace info
   ↓
4. node-subproc: run()
   - Loads handler
   - Calls buildRuntime(..., invokeBroker, artifactBroker)
   ↓
5. buildRuntime()
   - Creates invoke() and artifacts API
   - Returns runtime object
   ↓
6. pack-handler.ts: run()
   - Executes buildPack()
   - Calls ctx.runtime.artifacts.write()
   ↓
7. ArtifactBroker.write()
   - Checks permissions (permissions.artifacts.write)
   - Writes atomically (temp → rename)
   - Saves metadata (.meta.json)
   ↓
8. Return result through entire chain
```

## Important Details

1. **Registry is optional**: If not passed → brokers are not created → APIs are unavailable
2. **Brokers are created in execute.ts**: Passed to runner → buildRuntime → handler
3. **Tracing is automatic**: traceId/spanId are generated automatically
4. **Chain protection is built-in**: InvokeBroker checks limits before each invocation
5. **Permissions are checked dynamically**: On each invoke/artifact.read/write
6. **Isolation is guaranteed**: Each invoke in a new sandbox

