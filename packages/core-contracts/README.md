# @kb-labs/core-contracts

Core system interface contracts — zero runtime dependencies, zero implementations.

## Overview

Defines the wire protocol and interface boundaries for the KB Labs core execution layer. Lives at layer 0 of the dependency graph: implementations depend on these contracts, not the other way around.

## Interfaces

### `IExecutionBackend`

Contract that all execution backends must satisfy:

```typescript
import type { IExecutionBackend, ExecutionRequest, ExecutionResponse } from '@kb-labs/core-contracts';

class MyBackend implements IExecutionBackend {
  async execute(
    request: ExecutionRequest,
    options?: ExecuteOptions
  ): Promise<ExecutionResponse> {
    // ...
  }

  async health(): Promise<HealthStatus> {
    return { healthy: true, backend: 'my-backend' };
  }

  async stats(): Promise<ExecutionStats> {
    return { activeRequests: 0, queueDepth: 0 };
  }
}
```

### `IPlatformGateway`

Low-level RPC interface for IPC/HTTP communication to platform services (used by child processes to call parent-side adapters):

```typescript
import type { IPlatformGateway, RequestContext } from '@kb-labs/core-contracts';

// Implementations: IPCGateway (child process), HTTPGateway (remote)
const result = await gateway.call({
  adapter: 'vectorStore',
  method: 'search',
  args: [queryVector, { limit: 10 }],
});
```

### `ISubprocessRunner`

Contract for spawning and managing subprocess workers:

```typescript
import type { ISubprocessRunner } from '@kb-labs/core-contracts';

const runner: ISubprocessRunner = {
  spawn(options): ChildProcess { ... },
  kill(pid: number): void { ... }
};
```

## Types

| Type | Description |
|------|-------------|
| `ExecutionRequest` | What gets sent to a backend (pluginId, handlerId, input, context) |
| `ExecutionRequestMeta` | Metadata attached to a request (traceId, tenantId, priority) |
| `ExecutionResponse` | What backends return (output, duration, error) |
| `ExecutionError` | Structured error with code, message, retryable flag |
| `HealthStatus` | Backend health check response |
| `ExecutionStats` | Runtime metrics (queue depth, active requests) |
| `VectorQuery` / `VectorSearchResult` | Vector store RPC shapes |
| `LLMOptions` / `LLMResponse` | LLM adapter RPC shapes |

## License

KB Public License v1.1 © KB Labs
