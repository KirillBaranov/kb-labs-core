# KB Labs Core (@kb-labs/core)

This is the **core library** for all KB Labs products and tools.  
It provides essential utilities, system interfaces, and shared functionality across the KB Labs ecosystem.  

**Goals:** Reliable core utilities, consistent APIs, and extensible architecture for all KB Labs projects.

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
Configuration management and runtime utilities:
- Environment variable handling
- Runtime configuration
- Type-safe configuration schemas

### @kb-labs/core-sys
System interfaces and utilities:
- **Logging**: Structured logging with multiple sinks
- **Filesystem**: Cross-platform file system operations
- **Repository**: Git repository utilities and metadata

## 🚀 Quick Start

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev         # Parallel dev mode for selected packages/apps
pnpm build       # Build all packages
pnpm test        # Run tests
pnpm lint        # Lint code
```

### Using Core Packages

```bash
# Install specific core packages
pnpm add @kb-labs/core-config @kb-labs/core-sys

# Example usage
import { getLogger } from '@kb-labs/core-sys/logging'
import { getEnvVar } from '@kb-labs/core-config'
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