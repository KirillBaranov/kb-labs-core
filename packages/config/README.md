# @kb-labs/core-config

> **Core configuration system for KB Labs products with 6-layer merging, YAML/JSON support, and comprehensive tracing.** Provides deterministic configuration resolution with detailed merge traces for debugging.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision & Purpose

**@kb-labs/core-config** is the foundation of KB Labs configuration system. It implements a sophisticated 6-layer configuration merging strategy that allows products to have defaults, profile overrides, preset configurations, workspace settings, local overrides, and CLI arguments - all merged deterministically with full traceability.

### What Problem Does This Solve?

- **Configuration Complexity**: Products need configuration from multiple sources (defaults, profiles, workspace, local, CLI) - config provides unified merging
- **Configuration Traceability**: Developers need to understand where configuration values come from - config provides detailed merge traces
- **Format Flexibility**: Teams prefer different config formats (YAML/JSON) - config supports both with auto-detection
- **Performance**: Reading config files repeatedly is slow - config provides LRU caching
- **Consistency**: Products need consistent configuration resolution - config provides single source of truth

### Why Does This Package Exist?

- **Single Configuration System**: All KB Labs products use the same configuration resolution logic
- **Deterministic Merging**: 6-layer merge ensures predictable configuration resolution
- **Developer Experience**: Detailed traces help debug configuration issues
- **Performance**: LRU caching improves performance for repeated reads

### What Makes This Package Unique?

- **6-Layer Merging**: Sophisticated layering system (runtime → profile → preset → workspace → local → CLI)
- **Comprehensive Tracing**: Every merge step is traced for debugging
- **Format Agnostic**: Supports both YAML and JSON with auto-detection
- **Product Normalization**: Handles kebab-case ↔ camelCase conversion automatically

## 📊 Package Status

### Development Stage

- [x] **Experimental** - Early development, API may change
- [x] **Alpha** - Core features implemented, testing phase
- [x] **Beta** - Feature complete, API stable, production testing
- [x] **Stable** - Production ready, API frozen
- [ ] **Maintenance** - Bug fixes only, no new features
- [ ] **Deprecated** - Will be removed in future version

**Current Stage**: **Stable**

**Target Stage**: **Stable** (maintained)

### Maturity Indicators

- **Test Coverage**: ~90% (target: 90%)
- **TypeScript Coverage**: 100% (target: 100%)
- **Documentation Coverage**: 85% (target: 100%)
- **API Stability**: Stable (API frozen, breaking changes only in major versions)
- **Breaking Changes**: None in last 6 months
- **Last Major Version**: 0.1.0
- **Next Major Version**: 1.0.0 (when Profiles v2 migration complete)

### Production Readiness

- [x] **API Stability**: API is stable and won't change without major version bump
- [x] **Error Handling**: Comprehensive error handling with clear error messages
- [x] **Logging**: Structured error reporting via diagnostics
- [x] **Testing**: Unit tests, integration tests present
- [x] **Performance**: LRU caching implemented for performance
- [x] **Security**: Path validation prevents traversal attacks
- [x] **Documentation**: API documentation and usage examples
- [x] **Migration Guide**: Supports both Profiles v1 and v2

## 🏗️ Architecture

### High-Level Architecture

The config package implements a 6-layer configuration system:

```
Configuration Resolution
    │
    ├──► Layer 1: Runtime Defaults (built-in)
    ├──► Layer 2: Profile Defaults (from profile manifest)
    ├──► Layer 3: Preset Defaults (from org preset package)
    ├──► Layer 4: Workspace Config (kb-labs.config.*)
    ├──► Layer 5: Local Config (.kb/<product>/<product>.config.json)
    └──► Layer 6: CLI Overrides (command line arguments)
```

### Core Components

#### `getProductConfig()` - Main Configuration Resolver

- **Purpose**: Resolves product configuration by merging 6 layers
- **Responsibilities**: 
  - Find workspace root
  - Load workspace config
  - Resolve profile defaults
  - Load preset defaults
  - Load local config
  - Merge with CLI overrides
  - Return merged config with trace
- **Dependencies**: `core-types`, `yaml`, `zod`, `ajv`
- **Exports**: `ProductConfigResult<T>` with config and trace

#### `layeredMergeWithTrace()` - Merge Engine

- **Purpose**: Merges configuration layers with detailed tracing
- **Responsibilities**: 
  - Deep merge objects
  - Track merge operations
  - Generate merge trace
- **Dependencies**: None (pure function)
- **Exports**: `LayeredMergeResult` with merged config and trace

#### Profile Resolution System

- **Purpose**: Resolves Profiles v2 with scope selection
- **Responsibilities**: 
  - Load profile manifests
  - Resolve profile extends
  - Select scopes
  - Extract profile defaults
- **Dependencies**: `zod` for validation
- **Exports**: `resolveProfile()`, `selectProfileScope()`

### Design Patterns

- **Layered Architecture**: 6-layer configuration system
- **Strategy Pattern**: Different merge strategies for different layer types
- **Cache Pattern**: LRU cache for file system reads
- **Builder Pattern**: Configuration built layer by layer

### Data Flow

```
getProductConfig({ product, ... })
    │
    ├──► findNearestConfig() → workspace root
    ├──► readWorkspaceConfig() → workspace config
    ├──► resolveProfile() → profile defaults
    ├──► resolvePreset() → preset defaults
    ├──► readLocalConfig() → local config
    ├──► layeredMergeWithTrace() → merged config + trace
    └──► return { config, trace }
```

### State Management

- **State Type**: Local (per function call) + cached (LRU)
- **State Storage**: Memory (LRU cache for file reads)
- **State Lifecycle**: Created per call, cached for performance
- **State Persistence**: No persistence (stateless API)

### Concurrency Model

- **Single-threaded**: All operations are async but single-threaded
- **Thread Safety**: N/A (Node.js single-threaded event loop)
- **Race Conditions**: None (stateless API)
- **Deadlocks**: None

### Error Handling Strategy

- **Error Types**: `KbError` with error codes and hints
- **Error Propagation**: Errors thrown and caught by caller
- **Error Recovery**: No automatic recovery (caller must handle)
- **Error Logging**: Diagnostics array for non-fatal issues

## 🚀 Quick Start

### Installation

```bash
pnpm add @kb-labs/core-config
```

### Basic Usage

```typescript
import { getProductConfig } from '@kb-labs/core-config';

const result = await getProductConfig({
  cwd: process.cwd(),
  product: 'aiReview',
  cli: { debug: true }
}, schema);

console.log(result.config); // Merged configuration
console.log(result.trace);   // Detailed merge trace
```

## ✨ Features

- **YAML/JSON Support**: Automatic format detection and parsing
- **Find-up Resolution**: Walks up directory tree to find config files
- **Layered Merge**: Deterministic configuration merging with detailed trace
- **Product Normalization**: Consistent kebab-case (FS) ↔ camelCase (code) mapping
- **LRU Caching**: Filesystem read caching with invalidation
- **Error Handling**: Standardized errors with helpful hints
- **Schema Versioning**: All configs include `schemaVersion: "1.0"`

## API

### Core Functions

```typescript
import { 
  getProductConfig, 
  explainProductConfig, 
  readConfigFile,
  findNearestConfig,
  clearCaches 
} from '@kb-labs/core-config';

// Get product configuration with trace
const result = await getProductConfig({
  cwd: '/path/to/project',
  product: 'aiReview',
  cli: { debug: true }
}, schema);

console.log(result.config); // Merged configuration
console.log(result.trace);   // Detailed merge trace

// Explain configuration without resolving
const explanation = await explainProductConfig({
  cwd: '/path/to/project',
  product: 'aiReview'
}, schema);

// Read config file with format detection
const config = await readConfigFile('kb-labs.config.yaml');

// Find nearest config file
const { path, tried } = await findNearestConfig('/path/to/project');

// Clear caches (useful for tests)
clearCaches();
```

### Product Normalization

```typescript
import { toFsProduct, toConfigProduct, ProductId } from '@kb-labs/core-config';

// Convert to filesystem format
toFsProduct('aiReview'); // 'ai-review'
toFsProduct('aiDocs');   // 'ai-docs'

// Convert to code format
toConfigProduct('ai-review'); // 'aiReview'
toConfigProduct('ai-docs');   // 'aiDocs'
```

### Error Handling

```typescript
import { KbError, getExitCode } from '@kb-labs/core-config';

try {
  const config = await getProductConfig(opts, schema);
} catch (error) {
  if (error instanceof KbError) {
    console.error(error.message);
    console.error('Hint:', error.hint);
    process.exit(getExitCode(error));
  }
}
```

## Configuration Layers

The system merges configuration in this order (later layers override earlier ones):

1. **Runtime defaults** - Built-in defaults for each product
2. **Profile defaults** - From profile manifest defaults
3. **Preset defaults** - From org preset package
4. **Workspace config** - From `kb-labs.config.(json|yaml)`
5. **Local config** - From `.kb/<product>/<product>.config.json`
6. **CLI overrides** - From command line arguments

## Configuration Files

### Workspace Config (`kb-labs.config.yaml`)

```yaml
schemaVersion: "1.0"
profiles:
  default: "node-ts-lib@1.2.0"
  backend: "node-ts-lib@1.2.0"
products:
  ai-review:
    enabled: true
    rules: ["security", "performance"]
  devlink:
    watch: true
    build: true
```

### Local Config (`.kb/ai-review/ai-review.config.json`)

```json
{
  "$schema": "https://schemas.kb-labs.dev/config.schema.json",
  "schemaVersion": "1.0",
  "enabled": true,
  "rules": ["custom-rule"],
  "settings": {
    "debug": true
  }
}
```

## Error Codes

| Code | Exit Code | Description |
|------|-----------|-------------|
| `ERR_CONFIG_NOT_FOUND` | 2 | Config file not found |
| `ERR_CONFIG_INVALID` | 1 | Invalid config syntax |
| `ERR_PRESET_NOT_RESOLVED` | 1 | Preset package not found |
| `ERR_PROFILE_INCOMPATIBLE` | 1 | Profile version incompatible |

## Caching

The system uses LRU caching for filesystem reads:

- **Key**: `absPath|mtime|size`
- **Max Size**: 100 entries
- **Invalidation**: Automatic on file change
- **Clear**: Use `clearCaches()` for tests

## Examples

### Basic Usage

```typescript
import { getProductConfig } from '@kb-labs/core-config';

const config = await getProductConfig({
  cwd: process.cwd(),
  product: 'aiReview',
  cli: { debug: true }
}, aiReviewSchema);

console.log('AI Review config:', config.config);
console.log('Merge trace:', config.trace);
```

### CLI Integration

```typescript
import { getProductConfig, KbError, getExitCode } from '@kb-labs/core-config';

try {
  const result = await getProductConfig({
    cwd: process.cwd(),
    product: 'aiReview',
    cli: cliArgs
  }, schema);
  
  console.log(JSON.stringify(result.config, null, 2));
} catch (error) {
  if (error instanceof KbError) {
    console.error(`Error: ${error.message}`);
    if (error.hint) {
      console.error(`Hint: ${error.hint}`);
    }
    process.exit(getExitCode(error));
  }
  throw error;
}
```

### Testing

```typescript
import { clearCaches } from '@kb-labs/core-config';

beforeEach(() => {
  clearCaches(); // Clear caches between tests
});
```

## 📦 API Reference

### Main Exports

#### `getProductConfig<T>(opts: ResolveOptions, schema: any): Promise<ProductConfigResult<T>>`

Main configuration resolver that merges 6 layers and returns merged config with trace.

**Parameters:**
- `opts.cwd` (`string`): Workspace root directory
- `opts.product` (`ProductId`): Product identifier
- `opts.cli` (`Record<string, unknown>?`): CLI overrides
- `opts.writeFinal` (`boolean?`): Write final merged config to disk
- `opts.profileLayer` (`ProfileLayerInput?`): Profile layer input
- `schema` (`any`): Zod schema for validation

**Returns:**
- `Promise<ProductConfigResult<T>>`: Result with config and trace

**Throws:**
- `KbError`: Configuration errors

#### `explainProductConfig(opts: ResolveOptions, schema: any): Promise<MergeTrace[]>`

Returns configuration merge trace without side effects.

**Parameters:**
- `opts`: Same as `getProductConfig`
- `schema`: Zod schema

**Returns:**
- `Promise<MergeTrace[]>`: Array of merge steps

#### `resolveProfile(opts: ResolveProfileOptions): Promise<BundleProfile>`

Resolves Profiles v2 with extends and scope selection.

**Parameters:**
- `opts.cwd` (`string`): Workspace root
- `opts.profileId` (`string`): Profile identifier

**Returns:**
- `Promise<BundleProfile>`: Resolved profile

### Types & Interfaces

#### `ProductConfigResult<T>`

```typescript
interface ProductConfigResult<T> {
  config: T;
  trace: MergeTrace[];
  hash?: string;
}
```

#### `MergeTrace`

```typescript
interface MergeTrace {
  layer: string;
  path: string;
  value: unknown;
  source: string;
}
```

#### `BundleProfile`

Resolved profile with scopes and products.

### Constants

- `ERROR_HINTS`: Error hints for common errors
- `SYSTEM_DEFAULTS`: System-wide default configuration

## 🔧 Configuration

### Configuration Options

The 6-layer configuration system:

1. **Runtime defaults** - Built-in defaults for each product
2. **Profile defaults** - From profile manifest defaults
3. **Preset defaults** - From org preset package (`$extends`)
4. **Workspace config** - From `kb-labs.config.(json|yaml)`
5. **Local config** - From `.kb/<product>/<product>.config.json`
6. **CLI overrides** - From command line arguments

### Environment Variables

- None (all configuration via files and options)

### Default Values

- **Cache Size**: 100 entries (LRU)
- **Config Format**: Auto-detected (YAML/JSON)
- **Schema Version**: "1.0"

## 🔗 Dependencies

### Runtime Dependencies

- `@kb-labs/core-types` (`link:`): TypeScript type definitions
- `ajv` (`^8.17.1`): JSON schema validation
- `ajv-formats` (`^3.0.1`): Additional formats for AJV
- `picomatch` (`^4.0.2`): Pattern matching
- `yaml` (`^2.8.0`): YAML parsing
- `zod` (`^4.1.5`): Schema validation

### Development Dependencies

- `@kb-labs/devkit` (`link:`): DevKit presets
- `@types/node` (`^24.3.3`): Node.js type definitions
- `tsup` (`^8.5.0`): TypeScript bundler
- `typescript` (`^5.6.3`): TypeScript compiler
- `vitest` (`^3.2.4`): Test runner

### Internal Dependencies

All dependencies are internal to `kb-labs-core` repository via `link:` protocol.

## 🧪 Testing

### Test Structure

```
src/__tests__/
├── cache.spec.ts
├── fs-atomic.spec.ts
├── init-workspace.spec.ts
├── kb-error.spec.ts
├── preset-lockfile.spec.ts
├── product-config.spec.ts
├── product-config-profiles.spec.ts
├── profiles-resolver.spec.ts
├── profiles-section.spec.ts
├── runtime.spec.ts
├── upsert-lockfile.spec.ts
└── validate-config.spec.ts
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

### Test Coverage

- **Current Coverage**: ~90%
- **Target Coverage**: 90%
- **Coverage Gaps**: Edge cases in profile resolution

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(n) where n = number of layers + profile depth
- **Space Complexity**: O(m) where m = cached config size
- **Bottlenecks**: File I/O for config/profile loading
- **Optimization Opportunities**: Additional caching for workspace config

### Scalability

- **Horizontal Scaling**: Not applicable (local file system)
- **Vertical Scaling**: Limited by file system I/O
- **Limitations**: Single-threaded Node.js execution

## 🔒 Security

### Security Considerations

- **Input Validation**: All inputs validated via Zod schemas
- **Path Traversal**: Workspace root resolution prevents path traversal
- **File System**: Atomic file writes prevent corruption
- **Schema Validation**: All configs validated against schemas

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Single Workspace**: Only supports one workspace root per call
- **Sequential Loading**: Config layers loaded sequentially (could be parallel)
- **Profile v1 Support**: Legacy profile format support may be removed in v1.0

### Future Improvements

- **Parallel Loading**: Load config layers in parallel
- **Streaming Config**: Support streaming for large configs
- **Profile v2 Only**: Remove v1 support in v1.0.0

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- **v1.0.0**: Remove Profiles v1 support (migrate to v2)

## 📚 Examples

### Example 1: Basic Configuration

```typescript
import { getProductConfig } from '@kb-labs/core-config';

const result = await getProductConfig({
  cwd: process.cwd(),
  product: 'aiReview'
}, schema);

console.log(result.config);
```

### Example 2: With CLI Overrides

```typescript
const result = await getProductConfig({
  cwd: process.cwd(),
  product: 'aiReview',
  cli: { debug: true, verbose: true }
}, schema);
```

### Example 3: Configuration Trace

```typescript
const trace = await explainProductConfig({
  cwd: process.cwd(),
  product: 'aiReview'
}, schema);

trace.forEach(step => {
  console.log(`${step.layer}: ${step.path} = ${step.value} (from ${step.source})`);
});
```

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs
