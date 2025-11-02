# KB Labs Core (@kb-labs/core)

> **Core library for all KB Labs products and tools.** Provides essential utilities, system interfaces, and shared functionality across the KB Labs ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision

KB Labs Core is the runtime core with profiles resolver/validator and infrastructure abstractions. It provides reliable core utilities, consistent APIs, and extensible architecture for all KB Labs projects. This is the foundation of the **@kb-labs** ecosystem, enabling all other products to build on top of a stable, well-designed core.

The project solves the problem of code duplication and inconsistent APIs across the KB Labs ecosystem by providing a unified foundation for configuration management, profile resolution, system interfaces, and bundle orchestration. All KB Labs products can rely on Core for consistent behavior, security constraints, and cross-platform compatibility.

This project is part of the **@kb-labs** ecosystem and integrates seamlessly with other KB Labs tools including CLI, REST API, Analytics, and all AI-powered products.

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start development mode for all packages
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Basic Usage

The main entry point for KB Labs Core is the bundle loader, which provides a unified interface to configuration, profiles, artifacts, and policy:

```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview',
  profileKey: 'default'
});

// Access merged configuration (6 layers)
const config = bundle.config as AiReviewConfig;

// Access artifacts
const rules = await bundle.artifacts.list('rules');

// Check permissions
if (!bundle.policy.permits('aiReview.run')) {
  throw new Error('Permission denied');
}

// Debug with trace
console.log(bundle.trace);
```

### Configuration

Core uses a 6-layer configuration system that merges values from multiple sources. See the [Configuration System](#⚙️-configuration-system) section for details.

## ✨ Features

- **6-Layer Configuration System**: Merges runtime defaults, profile defaults, preset defaults, workspace config, local config, and CLI overrides
- **Profile Resolution**: Intelligent profile resolution with cycle detection, security constraints, and artifact management
- **Bundle Orchestration**: Single entry point (`loadBundle()`) that coordinates config, profiles, artifacts, and policy
- **System Interfaces**: Cross-platform file system operations, structured logging, and Git repository utilities
- **Policy Engine**: Fine-grained permission system for product operations
- **Type Safety**: Full TypeScript support with strict type checking
- **Performance**: LRU caching with automatic invalidation and lazy loading

## 📁 Repository Structure

```
kb-labs-core/
├── apps/                    # Example applications and demos
│   └── demo/                # Example app demonstrating core functionality
├── packages/                # Core packages
│   ├── bundle/              # Bundle orchestrator and facade
│   ├── cli/                 # CLI commands for configuration management
│   ├── config/              # Configuration management and runtime utilities
│   ├── policy/              # Policy engine and permission system
│   ├── profile-toolkit/     # Profile utilities and helpers
│   ├── profiles/            # Profile system with artifacts and defaults
│   ├── sys/                 # System interfaces (logging, filesystem, repository)
│   └── types/               # Shared TypeScript types
├── docs/                    # Documentation
│   ├── adr/                 # Architecture Decision Records
│   ├── ADDING_PRODUCT.md    # Guide for adding new products
│   ├── BUNDLE_OVERVIEW.md   # Bundle system architecture
│   ├── CLI_README.md        # CLI documentation
│   ├── CONFIG_API.md         # Configuration API reference
│   ├── DOCUMENTATION.md      # Documentation standards
│   └── MIGRATION_GUIDE.md    # Migration guide
├── scripts/                 # Utility scripts
└── src/                     # Source code
```

### Directory Descriptions

- **`apps/`** - Example applications demonstrating core functionality and usage patterns
- **`packages/`** - Individual packages with their own package.json, each serving a specific purpose in the core architecture
- **`docs/`** - Comprehensive documentation including ADRs, API references, and guides
- **`scripts/`** - Utility scripts for development and maintenance tasks

## 📦 Packages

| Package | Description |
|---------|-------------|
| [@kb-labs/core-bundle](./packages/bundle/) | Facade orchestrating all components with single entry point (`loadBundle()`) |
| [@kb-labs/core-cli](./packages/cli/) | CLI commands for configuration management (`kb init`, `kb config`, `kb doctor`) |
| [@kb-labs/core-config](./packages/config/) | 6-layer configuration management with LRU caching and product normalization |
| [@kb-labs/core-policy](./packages/policy/) | Policy engine for fine-grained permission checking |
| [@kb-labs/core-profiles](./packages/profiles/) | Profile system with v1.0 manifest format, artifacts API, and security constraints |
| [@kb-labs/core-sys](./packages/sys/) | System interfaces for logging, filesystem operations, and Git repository utilities |
| [@kb-labs/core-types](./packages/types/) | Shared TypeScript types and type definitions |
| [@kb-labs/core-profile-toolkit](./packages/profile-toolkit/) | Utilities and helpers for profile management |

### Package Details

**@kb-labs/core-config** provides configuration management with layered merge:
- 6-layer configuration system (runtime → profile → preset → workspace → local → CLI)
- Product normalization (kebab-case ↔ camelCase)
- LRU caching with automatic invalidation
- Find-up resolution

**@kb-labs/core-profiles** implements the profile system with artifacts and defaults:
- New v1.0 manifest format
- Artifacts API (list, read, materialize)
- Extends resolution with cycle detection
- Security constraints (whitelist, size limits, SHA256 verification)

**@kb-labs/core-bundle** is the facade orchestrating all components:
- Single entry point (`loadBundle()`) for complete bundle
- Coordinates config, profiles, artifacts, and policy
- Lazy loading with detailed trace support

**@kb-labs/core-cli** provides CLI commands for configuration management:
- `kb init setup` - Initialize complete workspace
- `kb config get` - Get product configuration
- `kb config explain` - Explain configuration resolution
- `kb doctor` - Health check with suggestions

**@kb-labs/core-sys** provides system interfaces and utilities:
- **Logging**: Structured logging with multiple sinks
- **Filesystem**: Cross-platform file system operations
- **Repository**: Git repository utilities and metadata

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development mode for all packages |
| `pnpm build` | Build all packages |
| `pnpm build:all` | Build all packages recursively |
| `pnpm build:clean` | Clean and build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage reporting |
| `pnpm lint` | Lint all code |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format` | Format code with Prettier |
| `pnpm type-check` | TypeScript type checking |
| `pnpm check` | Run lint, type-check, and tests |
| `pnpm ci` | Full CI pipeline (clean, build, check) |
| `pnpm clean` | Clean build artifacts |
| `pnpm clean:all` | Clean all node_modules and build artifacts |
| `pnpm devkit:sync` | Sync DevKit configurations to workspace |
| `pnpm devkit:check` | Check if DevKit sync is needed |
| `pnpm devkit:force` | Force DevKit sync (overwrite existing) |

## 📋 Development Policies

- **Code Style**: ESLint + Prettier, TypeScript strict mode
- **Testing**: Vitest with fixtures for integration testing
- **Versioning**: SemVer with automated releases through Changesets
- **Architecture**: Document decisions in ADRs (see `docs/adr/`)
- **API Stability**: Core packages maintain backward compatibility
- **Documentation**: All public APIs must be documented
- **Cross-platform**: Ensure compatibility across different operating systems
- **Error Handling**: Provide clear error messages and proper error types

## 🔧 Requirements

- **Node.js**: >= 18.18.0
- **pnpm**: >= 9.0.0

## ⚙️ Configuration System

KB Labs Core implements a powerful 6-layer configuration system that merges values from multiple sources (later layers override earlier ones):

1. **Runtime defaults** - Built-in defaults for each product
2. **Profile defaults** - From profile manifest
3. **Preset defaults** - From org preset package
4. **Workspace config** - From `kb-labs.config.yaml`
5. **Local config** - From `.kb/<product>/<product>.config.json`
6. **CLI overrides** - From command line arguments

### Example Configuration

**kb-labs.config.yaml:**
```yaml
schemaVersion: "1.0"
profiles:
  default: "node-ts-lib@1.2.0"
products:
  ai-review:
    enabled: true
    rules: ["security", "performance"]
```

**Profile:** `.kb/profiles/node-ts-lib/profile.json`
```json
{
  "schemaVersion": "1.0",
  "name": "node-ts-lib",
  "exports": {
    "ai-review": {
      "rules": "artifacts/ai-review/rules.yml"
    }
  },
  "defaults": {
    "ai-review": {
      "$ref": "./defaults/ai-review.json"
    }
  }
}
```

## 📚 Documentation

- [Documentation Standard](./docs/DOCUMENTATION.md) - Full documentation guidelines
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Architecture Decisions](./docs/adr/) - ADRs for this project

**Guides:**
- [Migration Guide](./docs/MIGRATION_GUIDE.md) - Step-by-step guide for migrating products
- [Config API Reference](./docs/CONFIG_API.md) - Complete API documentation
- [Bundle Overview](./docs/BUNDLE_OVERVIEW.md) - System architecture
- [Adding a Product](./docs/ADDING_PRODUCT.md) - How to add a new product

**Architecture:**
- [Architecture and Repository Layout](./docs/adr/0001-architecture-and-reposity-layout.md) - Project structure
- [Core Facade](./docs/adr/0005-core-facade.md) - Bundle orchestrator design
- [Profiles Resolution Order](./docs/adr/0006-profiles-resolution-order-and-runtime-metadata.md) - Profile resolution logic

## 🔗 Related Packages

### Dependencies

- [@kb-labs/shared](https://github.com/KirillBaranov/kb-labs-shared) - Common types and utilities without side effects
- [@kb-labs/devkit](https://github.com/KirillBaranov/kb-labs-devkit) - Bootstrap and standards (CI templates, configs, sync)

### Used By

- [@kb-labs/cli](https://github.com/KirillBaranov/kb-labs-cli) - CLI wrapper providing unified CLI commands
- [@kb-labs/rest-api](https://github.com/KirillBaranov/kb-labs-rest-api) - REST API layer
- [@kb-labs/ai-review](https://github.com/KirillBaranov/kb-labs-ai-review) - AI Review product
- [@kb-labs/audit](https://github.com/KirillBaranov/kb-labs-audit) - Audit framework
- [@kb-labs/analytics](https://github.com/KirillBaranov/kb-labs-analytics) - Analytics pipeline
- All other KB Labs products

### Ecosystem

- [KB Labs](https://github.com/KirillBaranov/kb-labs) - Main ecosystem repository

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution process.

## 📄 License

MIT © KB Labs

---

**See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution process.**
