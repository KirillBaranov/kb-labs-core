# KB Labs Core

> Core runtime library for all KB Labs products — profiles, configuration, platform abstractions, IPC, LLM routing, and shared infrastructure.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Packages

| Package | Description |
|---------|-------------|
| [@kb-labs/core-bundle](./packages/core-bundle/) | Facade orchestrating config + profiles + policy into a single `loadBundle()` entry point |
| [@kb-labs/core-config](./packages/core-config/) | 6-layer configuration management with LRU caching and product normalization |
| [@kb-labs/core-contracts](./packages/core-contracts/) | Shared TypeScript interfaces and type contracts for the core layer |
| [@kb-labs/core-ipc](./packages/core-ipc/) | Cross-process IPC serialization protocol and transport |
| [@kb-labs/core-platform](./packages/core-platform/) | Platform facade — unified adapter-based access to FS, env, and runtime services |
| [@kb-labs/core-policy](./packages/core-policy/) | Fine-grained permission engine for product operations |
| [@kb-labs/core-resource-broker](./packages/core-resource-broker/) | Resource acquisition, lifecycle, and broker coordination |
| [@kb-labs/core-runtime](./packages/core-runtime/) | Platform initialization and runtime bootstrap |
| [@kb-labs/core-sandbox](./packages/core-sandbox/) | Sandboxed plugin execution with output capture |
| [@kb-labs/core-state-broker](./packages/core-state-broker/) | Distributed state management and pub/sub coordination |
| [@kb-labs/core-state-daemon](./packages/core-state-daemon/) | Persistent state daemon process |
| [@kb-labs/core-sys](./packages/core-sys/) | System interfaces — structured logging, filesystem, and Git repository utilities |
| [@kb-labs/core-tenant](./packages/core-tenant/) | Multi-tenancy primitives, quotas, and rate limiting |
| [@kb-labs/core-types](./packages/core-types/) | Shared TypeScript types across the core ecosystem |
| [@kb-labs/core-workspace](./packages/core-workspace/) | Workspace discovery and context resolution |
| [@kb-labs/llm-router](./packages/llm-router/) | LLM routing with metadata-based adapter selection and immutable bound adapters |

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
```

### Basic Usage

```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview',
  profileKey: 'default'
});

// Access merged configuration (6 layers)
const config = bundle.config as AiReviewConfig;

// Check permissions
if (!bundle.policy.permits('aiReview.run')) {
  throw new Error('Permission denied');
}
```

## Configuration System

6-layer merge (later layers override earlier):

1. Runtime defaults
2. Profile defaults
3. Preset defaults
4. Workspace config (`kb-labs.config.yaml`)
5. Local config (`.kb/<product>/<product>.config.json`)
6. CLI overrides

## Documentation

- [Documentation Standard](./docs/DOCUMENTATION.md)
- [Bundle Overview](./docs/BUNDLE_OVERVIEW.md)
- [Config API Reference](./docs/CONFIG_API.md)
- [Adding a Product](./docs/ADDING_PRODUCT.md)
- [Architecture Decisions](./docs/adr/)

## Related

**Dependencies:** [@kb-labs/shared](https://github.com/KirillBaranov/kb-labs-shared), [@kb-labs/plugin](https://github.com/KirillBaranov/kb-labs-plugin)

**Used by:** [@kb-labs/cli](https://github.com/KirillBaranov/kb-labs-cli), [@kb-labs/rest-api](https://github.com/KirillBaranov/kb-labs-rest-api), all KB Labs products

## License

KB Public License v1.1 © KB Labs
