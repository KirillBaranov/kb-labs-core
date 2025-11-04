# Как работает система кросс-плагинных вызовов

## Полный Flow работы

### 1. Входная точка (CLI или REST)

#### CLI:
```typescript
// plugin-adapter-cli/src/handler.ts
export async function executeCommand(
  command: CliCommandDecl,
  manifest: ManifestV2,
  ...
  registry?: PluginRegistry  // ← Передается реестр плагинов
) {
  // 1. Генерируем root traceId
  const traceId = createId();
  
  // 2. Создаем execution context
  const execCtx = {
    requestId: createId(),
    pluginId: manifest.id,
    traceId,  // ← traceId в контексте
    ...
  };
  
  // 3. Вызываем runtime.execute с registry
  const result = await runtimeExecute(
    { handler, input, manifest, perms },
    execCtx,
    registry  // ← Передаем registry
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
  registry?: PluginRegistry  // ← Передается реестр плагинов
) {
  // 1. Извлекаем или генерируем traceId
  const traceId = request.headers['x-trace-id'] || createId();
  
  // 2. Создаем execution context
  const execCtx = {
    requestId: request.id || createId(),
    pluginId: manifest.id,
    traceId,  // ← traceId в контексте
    ...
  };
  
  // 3. Вызываем runtime.execute с registry
  const result = await runtimeExecute(
    { handler, input, manifest, perms },
    execCtx,
    registry  // ← Передаем registry
  );
}
```

### 2. Инициализация в execute.ts

```typescript
// plugin-runtime/src/execute.ts
export async function execute(
  args: ExecuteInput,
  ctx: ExecutionContext,
  registry?: PluginRegistry  // ← Опциональный registry
) {
  // 1. Генерируем/наследуем traceId
  const traceId = ctx.traceId || createId();
  
  // 2. Генерируем spanId для текущего выполнения
  const spanId = ctx.spanId || createId();
  
  // 3. Инициализируем chain limits (защита от рекурсии)
  const chainLimits: ChainLimits = {
    maxDepth: 8,
    maxFanOut: 16,
    maxChainTime: perms.quotas?.timeoutMs || 30000,
  };
  
  // 4. Инициализируем chain state (отслеживание глубины)
  const chainState: InvokeContext = {
    depth: 0,
    fanOut: 0,
    visited: [],
    remainingMs: perms.quotas?.timeoutMs || 30000,
  };
  
  // 5. Функция для расчета остаточного времени
  const remainingMs = (): number => {
    const elapsed = Date.now() - startedAt;
    return Math.max(0, initialTimeout - elapsed);
  };
  
  // 6. ⭐ ИНИЦИАЛИЗИРУЕМ БРОКЕРЫ (если registry предоставлен)
  let invokeBroker: InvokeBroker | undefined;
  let artifactBroker: ArtifactBroker | undefined;
  
  if (registry) {
    // Создаем InvokeBroker для кросс-плагинных вызовов
    invokeBroker = new InvokeBrokerImpl(
      registry,
      args.manifest,
      ctx,
      chainLimits,
      chainState
    );
    
    // Создаем ArtifactBroker для управления артефактами
    artifactBroker = new ArtifactBrokerImpl(
      args.manifest,
      ctx,
      registry
    );
  }
  
  // 7. Обновляем контекст с trace info
  const updatedCtx: ExecutionContext = {
    ...ctx,
    traceId,
    spanId,
    parentSpanId: ctx.parentSpanId,
    chainLimits,
    chainState,
    remainingMs,
  };
  
  // 8. Проверяем capabilities, валидируем input/output...
  
  // 9. Запускаем handler в песочнице
  const runner = nodeSubprocRunner(devMode);
  const res = await runner.run({
    ctx: updatedCtx,
    perms: args.perms,
    handler: args.handler,
    input: args.input,
    manifest: args.manifest,
    invokeBroker,      // ← Передаем брокеры в runner
    artifactBroker,    // ← Передаем брокеры в runner
  });
}
```

### 3. Runner создает изолированную песочницу

```typescript
// plugin-runtime/src/sandbox/node-subproc.ts
export function createInProcessRunner(): SandboxRunner {
  return {
    async run(args) {
      // 1. Загружаем handler модуль
      const handlerModule = await import(handlerPath);
      const handlerFn = handlerModule[handlerRef.export];
      
      // 2. Фильтруем env по разрешениям
      const env = pickEnv(perms.env, process.env);
      
      // 3. ⭐ СТРОИМ RUNTIME с брокерами
      const runtime = buildRuntime(
        perms,
        ctx,
        env,
        args.manifest,
        args.invokeBroker,    // ← Передаем InvokeBroker
        args.artifactBroker  // ← Передаем ArtifactBroker
      );
      
      // 4. Вызываем handler с runtime context
      const result = await handlerFn(input, {
        requestId: ctx.requestId,
        pluginId: ctx.pluginId,
        traceId: ctx.traceId,      // ← traceId доступен
        spanId: ctx.spanId,        // ← spanId доступен
        parentSpanId: ctx.parentSpanId,
        runtime: {
          fetch,
          fs,
          env,
          log,
          invoke: runtime.invoke,           // ← invoke API доступен
          artifacts: runtime.artifacts,    // ← artifacts API доступен
        },
      });
      
      return { ok: true, data: result };
    }
  };
}
```

### 4. buildRuntime создает API для handler

```typescript
// plugin-runtime/src/sandbox/child/runtime.ts
export function buildRuntime(
  perms: PermissionSpec,
  ctx: ExecutionContext,
  env: NodeJS.ProcessEnv,
  manifest: ManifestV2,
  invokeBroker?: InvokeBroker,      // ← Опциональный InvokeBroker
  artifactBroker?: ArtifactBroker   // ← Опциональный ArtifactBroker
) {
  // Создаем стандартные API (fetch, fs, env, log)
  const fetch = createWhitelistedFetch(perms.net);
  const fs = createFsShim(perms.fs, ctx.workdir, ctx.outdir, ctx);
  const envAccessor = createEnvAccessor(perms.env?.allow, env);
  const log = (level, msg, meta) => { /* IPC logging */ };
  
  // ⭐ СОЗДАЕМ INVOKE API
  const invoke = async <T = unknown>(
    request: InvokeRequest
  ): Promise<InvokeResult<T>> => {
    if (!invokeBroker) {
      throw new Error('Invoke broker not available');
    }
    return invokeBroker.invoke<T>(request);
  };
  
  // ⭐ СОЗДАЕМ ARTIFACTS API
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
    invoke,      // ← Доступен в handler
    artifacts,   // ← Доступен в handler
  };
}
```

### 5. Handler использует API

```typescript
// Пример: mind-cli/src/cli/pack-handler.ts
export async function run(input, ctx) {
  // 1. Выполняем основную логику
  const result = await buildPack({ ... });
  
  // 2. ⭐ ЗАПИСЫВАЕМ АРТЕФАКТ через artifacts API
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
    // Fallback на прямой FS (для обратной совместимости)
    await ctx.runtime.fs.writeFile(path, result.markdown);
  }
  
  return { ok: true, packPath };
}
```

### 6. InvokeBroker обрабатывает кросс-плагинные вызовы

```typescript
// plugin-runtime/src/invoke/broker.ts
export class InvokeBroker {
  async invoke<T = unknown>(request: InvokeRequest): Promise<InvokeResult<T>> {
    // 1. Нормализуем target: @pluginId@version:METHOD /path
    const resolved = this.resolveTarget(request.target);
    
    // 2. Проверяем chain limits (depth, fanOut, visited)
    this.checkChainLimits(resolved.pluginId);
    
    // 3. ⭐ ПРОВЕРЯЕМ ПРАВА на вызов
    const permissionCheck = resolveInvokeDecision(
      this.callerManifest.permissions?.invoke,
      { pluginId, method, path }
    );
    
    if (!permissionCheck.allow) {
      throw toErrorEnvelope(E_PLUGIN_INVOKE_DENIED, ...);
    }
    
    // 4. Рассчитываем остаточный таймаут
    const remainingMs = Math.min(
      this.chainState.remainingMs,
      targetManifest.quotas.timeoutMs
    );
    
    // 5. Создаем новый изолированный контекст для цели
    const targetCtx: ExecutionContext = {
      ...this.callerCtx,
      traceId: request.session?.traceId || this.callerCtx.traceId,
      spanId: createId(),
      parentSpanId: this.callerCtx.spanId,  // ← Цепочка span
      depth: this.chainState.depth + 1,
      remainingMs: () => remainingMs,
    };
    
    // 6. ⭐ ВЫЗЫВАЕМ ЦЕЛЕВОЙ ПЛАГИН через runtime.execute
    const result = await runtimeExecute(
      {
        handler: resolved.handlerRef,
        input: request.input,
        manifest: targetManifest,
        perms: targetManifest.permissions,
      },
      targetCtx,
      this.registry  // ← Передаем registry дальше
    );
    
    return { ok: true, data: result.data };
  }
}
```

### 7. ArtifactBroker управляет артефактами

```typescript
// plugin-runtime/src/artifacts/broker.ts
export class ArtifactBroker {
  async write(request: ArtifactWriteRequest): Promise<{ path: string; meta: ArtifactMeta }> {
    // 1. ⭐ ПРОВЕРЯЕМ ПРАВА на запись
    const permissionCheck = this.checkWritePermission(request);
    if (!permissionCheck.allow) {
      throw toErrorEnvelope(E_ARTIFACT_WRITE_DENIED, ...);
    }
    
    // 2. Преобразуем логический путь в физический
    // Логический: '.kb/mind/pack/latest.md'
    // Физический: '.artifacts/@kb-labs/mind/.kb/mind/pack/latest.md'
    const physicalPath = this.resolvePath(request.to, request.path);
    
    // 3. Атомарная запись: temp → rename
    const tmpPath = `${physicalPath}.${Date.now()}.part`;
    await fs.writeFile(tmpPath, data);
    
    // 4. Вычисляем метаданные (sha256, size, contentType)
    const meta: ArtifactMeta = {
      owner: this.callerCtx.pluginId,
      size: buffer.length,
      sha256: hash(buffer),
      contentType: request.contentType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // 5. Сохраняем метаданные
    await fs.writeFile(`${tmpPath}.meta.json`, JSON.stringify(meta));
    
    // 6. Атомарный rename
    await fs.rename(tmpPath, physicalPath);
    await fs.rename(`${tmpPath}.meta.json`, `${physicalPath}.meta.json`);
    
    return { path: physicalPath, meta };
  }
  
  async read(request: ArtifactReadRequest): Promise<Buffer | object> {
    // 1. ⭐ ПРОВЕРЯЕМ ПРАВА на чтение
    const permissionCheck = this.checkReadPermission(request);
    if (!permissionCheck.allow) {
      throw toErrorEnvelope(E_ARTIFACT_READ_DENIED, ...);
    }
    
    // 2. Преобразуем логический путь в физический
    const physicalPath = this.resolvePath(request.from, request.path);
    
    // 3. Читаем данные
    const data = await fs.readFile(physicalPath);
    
    // 4. Проверяем contentType если указан accept
    const meta = await this.readMeta(physicalPath);
    if (request.accept && !request.accept.includes(meta.contentType)) {
      throw toErrorEnvelope(E_ARTIFACT_READ_DENIED, ...);
    }
    
    return data;
  }
}
```

## Ключевые моменты

### 1. Условная инициализация брокеров
- Брокеры создаются **только если передан `registry`**
- Если `registry` не передан → брокеры `undefined` → API недоступны
- Это позволяет работать в режиме без кросс-плагинных вызовов

### 2. Трассировка
- `traceId` генерируется на корневом запросе (CLI/REST)
- Каждый `execute()` создает новый `spanId`
- При `invoke()` создается новый `spanId` с `parentSpanId = caller.spanId`
- Все события аналитики включают `traceId`, `spanId`, `parentSpanId`, `depth`

### 3. Защита цепочек
- `ChainLimits`: maxDepth=8, maxFanOut=16, maxChainTime
- `InvokeContext`: depth, fanOut, visited[], remainingMs
- При превышении лимитов → `E_PLUGIN_CHAIN_TIMEOUT`

### 4. Изоляция
- Каждый `invoke()` запускается в новой песочнице
- Новый `workdir`/`outdir` для каждого вызова
- Quotas рассчитываются как `min(caller.remainingMs, target.quotas.timeoutMs)`

### 5. Разрешения
- **Invoke**: deny → routes allow → plugins allow → default deny
- **Artifacts**: проверка ACL перед каждым read/write
- Прямой FS доступ к `.artifacts/**` блокируется

### 6. Обратная совместимость
- Handlers проверяют наличие `ctx.runtime.artifacts` перед использованием
- Если API недоступно → fallback на прямой FS
- Это позволяет работать без registry

## Пример полного flow

```
1. CLI: kb mind pack -i "demo"
   ↓
2. plugin-adapter-cli: executeCommand()
   - Генерирует traceId
   - Создает execCtx
   - Вызывает runtimeExecute(..., registry)
   ↓
3. plugin-runtime: execute()
   - Генерирует spanId
   - Инициализирует InvokeBroker и ArtifactBroker (если registry)
   - Обновляет ctx с trace info
   ↓
4. node-subproc: run()
   - Загружает handler
   - Вызывает buildRuntime(..., invokeBroker, artifactBroker)
   ↓
5. buildRuntime()
   - Создает invoke() и artifacts API
   - Возвращает runtime объект
   ↓
6. pack-handler.ts: run()
   - Выполняет buildPack()
   - Вызывает ctx.runtime.artifacts.write()
   ↓
7. ArtifactBroker.write()
   - Проверяет права (permissions.artifacts.write)
   - Записывает атомарно (temp → rename)
   - Сохраняет метаданные (.meta.json)
   ↓
8. Возврат результата через всю цепочку
```

## Важные детали

1. **Registry опционален**: Если не передан → брокеры не создаются → API недоступны
2. **Брокеры создаются в execute.ts**: Передаются в runner → buildRuntime → handler
3. **Трассировка автоматическая**: traceId/spanId генерируются автоматически
4. **Защита цепочек встроена**: InvokeBroker проверяет лимиты перед каждым вызовом
5. **Разрешения проверяются динамически**: При каждом invoke/artifact.read/write
6. **Изоляция гарантирована**: Каждый invoke в новой песочнице

