# KB Labs Core (@kb-labs/core)

This is the **core library** for all KB Labs products and tools.  
It provides essential utilities, system interfaces, and shared functionality across the KB Labs ecosystem.  

**Goals:** Reliable core utilities, consistent APIs, and extensible architecture for all KB Labs projects.

## 🚀 Quick Start

### Load Bundle for Your Product

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

## 📁 Repository Structure

```
apps/
├── demo/                    # Example app demonstrating core functionality
packages/
├── config/                  # Configuration management and runtime utilities
├── sys/                     # System interfaces (logging, filesystem, repository)
fixtures/                    # Fixtures for snapshot/integration testing
docs/
└── adr/                     # Architecture Decision Records (ADRs)
```

## 📦 Core Packages

### @kb-labs/core-config
Configuration management with layered merge:
- 6-layer configuration system (runtime → profile → preset → workspace → local → CLI)
- Product normalization (kebab-case ↔ camelCase)
- LRU caching with automatic invalidation
- Find-up resolution

### @kb-labs/core-profiles
Profile system with artifacts and defaults:
- New v1.0 manifest format
- Artifacts API (list, read, materialize)
- Extends resolution with cycle detection
- Security constraints (whitelist, size limits, SHA256 verification)

### @kb-labs/core-bundle
Facade orchestrating all components:
- Single entry point (`loadBundle()`) for complete bundle
- Coordinates config, profiles, artifacts, and policy
- Lazy loading with detailed trace support

### @kb-labs/core-cli
CLI commands for configuration management:
- `kb init setup` - Initialize complete workspace
- `kb config get` - Get product configuration
- `kb config explain` - Explain configuration resolution
- `kb doctor` - Health check with suggestions

### @kb-labs/core-sys
System interfaces and utilities:
- **Logging**: Structured logging with multiple sinks
- **Filesystem**: Cross-platform file system operations
- **Repository**: Git repository utilities and metadata

## 💻 Installation

```bash
pnpm install
```

## 🛠️ Development

```bash
pnpm dev         # Parallel dev mode for selected packages/apps
pnpm build       # Build all packages
pnpm test        # Run tests
pnpm lint        # Lint code
```

## 📚 Documentation

- **[Migration Guide](./MIGRATION_GUIDE.md)** - Step-by-step guide for migrating products
- **[Config API Reference](./docs/CONFIG_API.md)** - Complete API documentation
- **[Bundle Overview](./docs/BUNDLE_OVERVIEW.md)** - System architecture
- **[Adding a Product](./docs/ADDING_PRODUCT.md)** - How to add a new product

## 🔍 Configuration System

### 6 Layers of Configuration

Configuration is merged from 6 layers (later layers override earlier ones):

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

### Creating a New Core Package

```bash
# Copy existing package structure
cp -r packages/config packages/<new-package-name>
# Update package.json, tsconfig, and imports
```

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development mode for all packages |
| `pnpm build` | Build all packages |
| `pnpm build:clean` | Clean and build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint all code |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm type-check` | TypeScript type checking |
| `pnpm check` | Run lint, type-check, and tests |
| `pnpm ci` | Full CI pipeline (clean, build, check) |
| `pnpm clean` | Clean build artifacts |
| `pnpm clean:all` | Clean all node_modules and build artifacts |

## 📋 Development Policies

- **Code Style:** ESLint + Prettier, TypeScript strict mode
- **Testing:** Vitest with fixtures for integration testing
- **Versioning:** SemVer with automated releases through Changesets
- **Architecture:** Document decisions in ADRs (see `docs/adr/`)
- **API Stability:** Core packages maintain backward compatibility
- **Documentation:** All public APIs must be documented

## 🔧 Requirements

- **Node.js:** >= 18.18.0
- **pnpm:** >= 9.0.0

## 🚧 Roadmap

### Planned Core Packages

- **@kb-labs/core-crypto**: Cryptographic utilities and secure operations
- **@kb-labs/core-http**: HTTP client with retry, timeout, and error handling
- **@kb-labs/core-validation**: Schema validation and data transformation
- **@kb-labs/core-cache**: Caching layer with multiple backends
- **@kb-labs/core-storage**: Unified storage interface for files, databases, and cloud
- **@kb-labs/core-events**: Event system and pub/sub functionality
- **@kb-labs/core-metrics**: Performance monitoring and metrics collection

### Future Enhancements

- Plugin system for extensibility
- Cross-platform compatibility improvements
- Performance optimizations
- Additional logging sinks (Sentry, DataDog, etc.)
- Enhanced configuration validation
- TypeScript utility types and helpers

## 📄 License

MIT © KB Labs