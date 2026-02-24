# Changelog — @kb-labs/core

## 1.0.0 — 2026-02-24

First stable release. Prior history represents internal R&D — this is the first versioned public release.

### Packages

| Package | Version |
|---------|---------|
| `@kb-labs/core-platform` | 1.0.0 |
| `@kb-labs/core-runtime` | 1.0.0 |
| `@kb-labs/core-config` | 1.0.0 |
| `@kb-labs/core-contracts` | 1.0.0 |
| `@kb-labs/core-types` | 1.0.0 |
| `@kb-labs/core-sys` | 1.0.0 |
| `@kb-labs/core-workspace` | 1.0.0 |
| `@kb-labs/core-policy` | 1.0.0 |
| `@kb-labs/core-bundle` | 1.0.0 |
| `@kb-labs/core-sandbox` | 1.0.0 |
| `@kb-labs/core-ipc` | 1.0.0 |
| `@kb-labs/core-state-broker` | 1.0.0 |
| `@kb-labs/core-state-daemon` | 1.0.0 |
| `@kb-labs/core-resource-broker` | 1.0.0 |
| `@kb-labs/core-tenant` | 1.0.0 |
| `@kb-labs/llm-router` | 1.0.0 |

### What's included

**`@kb-labs/core-platform`** — Pure adapter interfaces for platform capabilities: `IAnalytics`, `IVectorStore`, `ILLM`, `ICache`, `IWorkflowEngine`, `IJobScheduler`, `IStateStore`. Includes NoOp implementations. Zero runtime dependencies — safe to import from any package.

**`@kb-labs/core-runtime`** — DI container and platform initialization. `initPlatform()` wires adapters and bootstraps the platform. Entry point for all KB Labs services.

**`@kb-labs/core-config`** — Configuration system with schema validation (AJV), YAML/JSON parsing, nearest-config resolution, and profile merging.

**`@kb-labs/core-contracts`** — Plugin system contracts and shared type definitions for the core layer.

**`@kb-labs/core-types`** — Shared TypeScript primitive types used across all core packages. Zero dependencies.

**`@kb-labs/core-sys`** — File system utilities, path resolution, and output formatting helpers.

**`@kb-labs/core-workspace`** — Workspace root detection and monorepo utilities.

**`@kb-labs/core-policy`** — Policy validator, rule engine, and policy bundle resolver for access control.

**`@kb-labs/core-bundle`** — Bundle resolution combining profiles, config, and build artifacts.

**`@kb-labs/core-sandbox`** — Universal sandbox isolation for CLI and REST API plugin execution.

**`@kb-labs/core-ipc`** — IPC transport layer: Unix socket and process IPC abstractions.

**`@kb-labs/core-state-broker`** — Cross-invocation state store with HTTP and in-memory backends.

**`@kb-labs/core-state-daemon`** — Standalone state daemon server (`kb-state-daemon`).

**`@kb-labs/core-resource-broker`** — Queue management, rate limiting, and retry logic.

**`@kb-labs/core-tenant`** — Multi-tenancy primitives: `TenantRateLimiter`, quota management, tenant context. Supports free/pro/enterprise tiers.

**`@kb-labs/llm-router`** — Adaptive LLM router with tier-based model selection and fallback support.

### Notes

- `core-platform` interfaces are the stable public API — all platform capabilities flow through these adapters
- `core-runtime` must be initialized before any plugin execution
- `core-state-daemon` runs as a separate process; `core-state-broker` connects to it via HTTP
- Circular dependency between `core-runtime` and `plugin-runtime` is resolved via dynamic import in plugin bootstrap
