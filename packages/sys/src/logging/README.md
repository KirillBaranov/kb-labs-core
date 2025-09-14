# Core Logger (`@kb-labs/core-sys/logging`)

## Purpose

Minimal, structured logger for KB Labs core packages.

- No colors, tables, or CLI formatting (those live in `@kb-labs/cli`)
- Provides a **single API** (`Logger`) for products, core, and CLI
- Supports multiple sinks (stdout, json, Sentry, …)
- Safe: sink failures never throw
- Optional redaction for sensitive fields (API keys, tokens)

## API Surface

### Logger

```ts
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void
  info(msg: string, meta?: Record<string, unknown>): void
  warn(msg: string, meta?: Record<string, unknown>): void
  error(msg: string, metaOrError?: Record<string, unknown> | Error): void
  child(bindings: { category?: string; meta?: Record<string, unknown> }): Logger
}
```

### Functions

- `getLogger(category?: string): Logger` — main entrypoint
- `configureLogger(opts: ConfigureOpts): void` — set level, sinks, filters
- `configureFromEnv(env?: NodeJS.ProcessEnv): void` — bootstrap from LOG_LEVEL, LOG_CATEGORY_FILTER
- `addSink(sink: LogSink): void` / `removeSink(sink: LogSink): void`
- `setLogLevel(level: LogLevel): void`

### Types

- `LogLevel = "debug" | "info" | "warn" | "error"`
- `LogRecord { time, level, category?, msg?, err?, meta? }`
- `LogSink { handle(rec: LogRecord): void|Promise<void> }`
- `Redactor: (rec: LogRecord) => LogRecord`

### Built-in Sinks

- `stdoutSink` — human-friendly plain text
- `jsonSink` — deterministic JSON (for CI/collectors)

### Redaction

- `createRedactor({ keys?: string[], mask?: string })` — masks sensitive fields in meta

## Design Notes

- **Core-only**: presentation (colors, tables) lives in CLI, not here
- **Fan-out**: multiple sinks can be active
- **Safe**: logger never throws, even if sinks fail
- **Deterministic**: JSON sink has stable field order (CI-friendly)

## Example

```ts
import { configureLogger, stdoutSink, getLogger } from "@kb-labs/core-sys/logging"

configureLogger({ level: "info", sinks: [stdoutSink] })

const log = getLogger("core")
log.info("initialized", { pid: process.pid })

const runLog = log.child({ category: "ai-review", meta: { runId: "r-123" } })
runLog.error("provider failed", new Error("timeout"))
```