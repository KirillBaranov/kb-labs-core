# @kb-labs/core-bundle

> **Facade package for KB Labs bundle system that orchestrates config, profiles, artifacts, and policy.** Single entry point (`loadBundle()`) for all KB Labs functionality, providing unified access to configuration, profiles, artifacts, and policy resolution.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision & Purpose

**@kb-labs/core-bundle** is the orchestration facade that provides a single entry point for all KB Labs products. It coordinates configuration resolution, profile loading, artifact management, and policy enforcement into a unified `Bundle` object.

### What Problem Does This Solve?

- **Multiple Entry Points**: Without bundle, each product would need to manually coordinate config, profiles, artifacts, and policy - leading to code duplication and inconsistent behavior
- **Complex Configuration**: The 6-layer configuration system is complex - bundle hides this complexity behind a simple API
- **Artifact Management**: Artifacts need to be loaded, validated, and materialized - bundle provides a unified interface
- **Policy Enforcement**: Permission checking needs to be consistent across all products - bundle provides a unified policy API

### Why Does This Package Exist?

- **Single Source of Truth**: Provides one way to load all KB Labs functionality
- **Consistency**: Ensures all products use the same configuration resolution, profile loading, and policy enforcement
- **Developer Experience**: Simplifies integration - developers only need to call `loadBundle()` instead of coordinating multiple systems
- **Maintainability**: Centralizes orchestration logic, making it easier to maintain and evolve

### What Makes This Package Unique?

- **Orchestration Layer**: Not just a utility - it orchestrates multiple complex systems
- **Lazy Loading**: Artifacts are loaded on-demand, improving performance
- **Trace Support**: Provides detailed trace of configuration resolution for debugging
- **Backward Compatibility**: Supports both Profiles v1 and v2 formats

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

- **Test Coverage**: ~85% (target: 90%)
- **TypeScript Coverage**: 100% (target: 100%)
- **Documentation Coverage**: 90% (target: 100%)
- **API Stability**: Stable (API frozen, breaking changes only in major versions)
- **Breaking Changes**: None in last 6 months
- **Last Major Version**: 0.1.0
- **Next Major Version**: 1.0.0 (when Profiles v2 migration complete)

### Production Readiness

- [x] **API Stability**: API is stable and won't change without major version bump
- [x] **Error Handling**: Comprehensive error handling with clear error messages
- [x] **Logging**: Structured logging via platform logger adapters (`@kb-labs/core-platform` / `@kb-labs/core-runtime`)
- [x] **Testing**: Unit tests, integration tests present (4 test files)
- [x] **Performance**: LRU caching implemented for performance
- [x] **Security**: Uses security constraints from profiles and policy
- [x] **Documentation**: Complete API documentation and usage examples
- [x] **Migration Guide**: Supports both Profiles v1 and v2

## 🏗️ Architecture

### High-Level Architecture

The bundle package acts as a facade that orchestrates four main systems:

```
┌─────────────────────────────────────────┐
│         @kb-labs/core-bundle            │
│         (Orchestration Facade)          │
└─────────────────────────────────────────┘
              │
              ├──► @kb-labs/core-config (6-layer config resolution)
              ├──► @kb-labs/core-profiles (Profile loading & artifacts)
              ├──► @kb-labs/core-policy (Policy resolution & enforcement)
              └──► @kb-labs/core-sys (Output & utilities)
```

### Core Components

#### `loadBundle()` - Main Orchestration Function

- **Purpose**: Loads and orchestrates config, profiles, artifacts, and policy
- **Responsibilities**: 
  - Resolves workspace root
  - Loads and merges 6-layer configuration
  - Resolves profile (v1 or v2)
  - Creates artifacts wrapper
  - Resolves policy
  - Returns unified Bundle object
- **Dependencies**: `core-config`, `core-profiles`, `core-policy`, `core-sys`
- **Exports**: `Bundle<T>` interface

#### `explainBundle()` - Configuration Trace

- **Purpose**: Provides detailed trace of configuration resolution
- **Responsibilities**: 
  - Loads bundle (without side effects)
  - Returns configuration trace
- **Dependencies**: `loadBundle()` internally
- **Exports**: `MergeTrace[]` array

#### `initAll()` - Workspace Initialization

- **Purpose**: Initializes complete KB Labs workspace
- **Responsibilities**: 
  - Creates workspace config
  - Initializes profiles
  - Sets up policy
  - Creates lockfile
- **Dependencies**: `core-config`, `core-profiles`, `core-policy`
- **Exports**: `InitAllResult` with aggregated stats

#### Artifacts Wrapper

- **Purpose**: Provides lazy-loaded artifact access
- **Responsibilities**: 
  - Lists available artifacts
  - Materializes artifacts to filesystem
  - Reads artifact content (text/JSON)
- **Dependencies**: `core-profiles` for artifact loading
- **Exports**: Artifacts API in Bundle object

### Design Patterns

- **Facade Pattern**: Simplifies complex subsystem interactions
- **Lazy Loading**: Artifacts loaded on-demand
- **Builder Pattern**: `loadBundle()` builds complex Bundle object step-by-step
- **Strategy Pattern**: Supports multiple profile formats (v1/v2)

### Data Flow

```
User Code
    │
    ▼
loadBundle({ product, profileId, ... })
    │
    ├──► resolveWorkspaceRoot() → cwd
    ├──► readWorkspaceConfig() → workspace config
    ├──► resolveProfileV2() → profile
    ├──► getProductConfig() → merged config (6 layers)
    ├──► resolvePolicy() → policy rules
    ├──► createArtifactsWrapper() → artifacts API
    └──► return Bundle { config, profile, artifacts, policy, trace }
```

### State Management

- **State Type**: Local (per function call)
- **State Storage**: Memory (LRU cache for config/profile resolution)
- **State Lifecycle**: Created per `loadBundle()` call, cached for performance
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
- **Error Logging**: Structured logging via platform logger adapters

## 🚀 Quick Start

### Installation

```bash
pnpm add @kb-labs/core-bundle
```

### Basic Usage

```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview'
});

// Access merged configuration
const config = bundle.config as AiReviewConfig;

// Access artifacts
const rules = await bundle.artifacts.list('rules');

// Check permissions
if (!bundle.policy.permits('aiReview.run')) {
  throw new Error('Permission denied');
}
```

## ✨ Features

- **Single Entry Point**: `loadBundle()` function for all KB Labs functionality
- **Orchestration**: Coordinates config, profiles, artifacts, and policy resolution
- **Lazy Loading**: Artifacts are loaded on-demand
- **Product Normalization**: Handles kebab-case (FS) ↔ camelCase (code) conversion
- **Trace Support**: Detailed configuration resolution trace
- **Error Handling**: Comprehensive error codes with helpful hints

## API

### Core Functions

```typescript
import { loadBundle, explainBundle, clearCaches, ProductId } from '@kb-labs/core-bundle';

// Load complete bundle
const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview',
  profileKey: 'default', // optional, defaults to 'default'
  cli: { debug: true },  // optional CLI overrides
  writeFinalConfig: true // optional, writes final config
});

// Explain configuration (trace only)
const trace = await explainBundle({
  cwd: process.cwd(),
  product: 'aiReview',
  profileKey: 'default'
});

// Clear all caches
clearCaches();
```

### Bundle Object

```typescript
interface Bundle {
  product: ProductId;           // Product identifier
  config: unknown;              // Resolved configuration
  profile: {                    // Profile information
    key: string;               // Profile key from workspace
    name: string;              // Profile name
    version: string;           // Profile version
    overlays?: string[];       // Profile overlays
  };
  artifacts: {                  // Artifact management
    summary: Record<string, string[]>; // Available artifacts by key
    list(key: string): Promise<Array<{ relPath: string; sha256: string }>>;
    materialize(keys?: string[]): Promise<{
      filesCopied: number;
      filesSkipped: number;
      bytesWritten: number;
    }>;
  };
  policy: {                     // Policy information
    bundle?: string;            // Policy bundle name
    permits: (action: string, resource?: any) => boolean;
  };
  trace: MergeTrace[];         // Configuration resolution trace
}
```

## Usage Examples

### Basic Bundle Loading

```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview'
});

console.log('Product:', bundle.product);
console.log('Profile:', bundle.profile.name, bundle.profile.version);
console.log('Config:', bundle.config);
```

### Artifact Management

```typescript
// List available artifacts
const summary = bundle.artifacts.summary;
console.log('Available artifacts:', Object.keys(summary));

// List specific artifacts
const rules = await bundle.artifacts.list('rules');
console.log('Rule files:', rules.map(r => r.relPath));

// Materialize artifacts to .kb/<product>/
const result = await bundle.artifacts.materialize(['rules', 'prompts']);
console.log(`Materialized ${result.filesCopied} files`);
```

### Policy Checking

```typescript
// Check permissions
if (bundle.policy.permits('aiReview.run')) {
  await runAIReview();
} else {
  console.error('Permission denied');
}

// Check specific resource
if (bundle.policy.permits('profiles.materialize', 'ai-review')) {
  await bundle.artifacts.materialize();
}
```

### Configuration Trace

```typescript
// Explain configuration resolution
const trace = await explainBundle({
  cwd: process.cwd(),
  product: 'aiReview'
});

console.log('Configuration layers:');
trace.forEach(step => {
  console.log(`${step.layer}: ${step.path} = ${step.source}`);
});
```

## Product Support

The bundle system supports these products:

- `aiReview` - AI code review
- `aiDocs` - AI documentation
- `devlink` - Development linking
- `release` - Release management
- `devkit` - Development toolkit

## Error Handling

```typescript
import { KbError } from '@kb-labs/core-bundle';

try {
  const bundle = await loadBundle({ cwd, product: 'aiReview' });
} catch (error) {
  if (error instanceof KbError) {
    console.error(`Error: ${error.message}`);
    console.error(`Hint: ${error.hint}`);
    console.error(`Code: ${error.code}`);
  }
}
```

## Configuration Layers

The bundle system resolves configuration in this order:

1. **Runtime defaults** - Built-in defaults
2. **Profile defaults** - From profile manifest
3. **Preset defaults** - From org preset package
4. **Workspace config** - From `kb-labs.config.*`
5. **Local config** - From `.kb/<product>/<product>.config.json`
6. **CLI overrides** - From command line arguments

## Workspace Configuration

```yaml
# kb-labs.config.yaml
schemaVersion: "1.0"
profiles:
  default: "node-ts-lib@1.2.0"
  backend: "node-ts-lib@1.2.0"
$extends: "@kb-labs/org-preset@1.3.2"
policy:
  bundle: "default@1.0.0"
  overrides:
    rules:
      - action: "aiReview.run"
        allow: ["admin", "developer"]
products:
  ai-review:
    enabled: true
    rules: ["security", "performance"]
```

## Profile Structure

```json
{
  "$schema": "https://schemas.kb-labs.dev/profile/profile.schema.json",
  "schemaVersion": "1.0",
  "name": "node-ts-lib",
  "version": "1.2.0",
  "extends": ["@kb-labs/profile-base@^1.0.0"],
  "exports": {
    "ai-review": {
      "rules": "artifacts/ai-review/rules.yml",
      "prompts": "artifacts/ai-review/prompts/**"
    }
  },
  "defaults": {
    "ai-review": { "$ref": "./defaults/ai-review.json" }
  }
}
```

## Integration

The bundle system integrates with all KB Labs products:

```typescript
// In ai-review package
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview'
});

// Use configuration
const config = bundle.config as AiReviewConfig;

// Read rules from artifacts
const rules = await bundle.artifacts.list('rules');
for (const rule of rules) {
  const content = await readArtifact(bundle.profile, rule.relPath);
  // Process rule content
}

// Check permissions
if (!bundle.policy.permits('aiReview.run')) {
  throw new Error('Permission denied');
}
```

## Caching

The bundle system uses LRU caching for performance:

```typescript
import { clearCaches } from '@kb-labs/core-bundle';

// Clear all caches (useful for tests)
clearCaches();
```

## Testing

```typescript
import { loadBundle, clearCaches } from '@kb-labs/core-bundle';

describe('My Test', () => {
  beforeEach(() => {
    clearCaches(); // Clear caches between tests
  });

  it('should load bundle', async () => {
    const bundle = await loadBundle({
      cwd: testDir,
      product: 'aiReview'
    });
    
    expect(bundle.product).toBe('aiReview');
    expect(bundle.profile.name).toBeDefined();
  });
});
```

## Initialization (Init System)

The bundle package also provides the `initAll()` function for workspace initialization.

### initAll()

Initialize a complete KB Labs workspace with configuration, profiles, policy, and lockfile:

```typescript
import { initAll } from '@kb-labs/core-bundle';

const result = await initAll({
  cwd: process.cwd(),
  format: 'yaml',                    // or 'json'
  products: ['aiReview'],            // products to set up
  profileKey: 'default',
  profileRef: 'node-ts-lib',         // npm package or local path
  presetRef: '@kb-labs/org-preset@^1.0.0', // optional
  scaffoldLocalProfile: true,        // create local profile scaffold
  policyBundle: 'default',           // optional
  dryRun: false,
  force: false,
});

// Result contains aggregated stats
console.log(`Created: ${result.stats.created}`);
console.log(`Updated: ${result.stats.updated}`);
console.log(`Skipped: ${result.stats.skipped}`);
console.log(`Conflicts: ${result.stats.conflicts}`);
```

### What Gets Created

Running `initAll()` with default options creates:

```
workspace/
├── kb-labs.config.yaml          # Workspace configuration
├── .kb/
│   ├── lock.json               # Lockfile with schema version
│   ├── profiles/
│   │   └── node-ts-lib/
│   │       ├── profile.json    # Profile manifest (new format)
│   │       ├── defaults/
│   │       │   └── ai-review.json
│   │       └── artifacts/
│   │           └── ai-review/
│   │               ├── rules.yml
│   │               └── prompts/
│   │                   └── review.md
│   └── ai-review/
│       └── ai-review.config.json  # Product-specific config
└── .gitignore                   # Updated with KB Labs entries
```

### Init Options

- **format**: `'yaml'` (default) or `'json'` - workspace config format
- **products**: Array of `ProductId` - which products to initialize (default: `['aiReview']`)
- **profileKey**: Profile key in workspace config (default: `'default'`)
- **profileRef**: Profile reference - npm package like `'@kb-labs/profile-node@^1.0.0'` or local path
- **scaffoldLocalProfile**: Create local profile scaffold (default: `false`)
- **presetRef**: Org preset to extend (optional)
- **policyBundle**: Policy bundle name (optional)
- **dryRun**: Preview changes without writing (default: `false`)
- **force**: Overwrite existing files (default: `false`)

### Idempotency

The init system is idempotent - running it multiple times with the same options will skip unchanged files:

```typescript
// First run - creates files
await initAll({ cwd, products: ['aiReview'], scaffoldLocalProfile: true });

// Second run - skips unchanged files
const result = await initAll({ cwd, products: ['aiReview'] });
console.log(result.stats.skipped); // > 0
```

### Dry Run

Preview what would be created without making changes:

```typescript
const result = await initAll({
  cwd: process.cwd(),
  products: ['aiReview'],
  scaffoldLocalProfile: true,
  dryRun: true,
});

// Check what would be created
result.workspace.actions.forEach(action => {
  console.log(`${action.kind}: ${action.path}`);
});
```

## 📦 API Reference

### Main Exports

#### `loadBundle<T>(opts: LoadBundleOptions): Promise<Bundle<T>>`

Main orchestration function that loads and coordinates all KB Labs functionality.

**Parameters:**
- `opts.cwd` (`string?`): Workspace root directory (auto-detected if omitted)
- `opts.product` (`ProductId`): Product identifier (e.g., `'aiReview'`)
- `opts.profileId` (`string?`): Profile identifier (defaults to workspace default)
- `opts.scopeId` (`string?`): Scope identifier within profile
- `opts.cli` (`Record<string, unknown>?`): CLI overrides for configuration
- `opts.writeFinalConfig` (`boolean?`): Write final merged config to disk
- `opts.validate` (`boolean | 'warn'?`): Validate configuration schema

**Returns:**
- `Promise<Bundle<T>>`: Bundle object with config, profile, artifacts, policy, and trace

**Throws:**
- `KbError`: Configuration errors, profile not found, etc.

**Example:**
```typescript
const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview',
  profileId: 'default',
  validate: true
});
```

#### `explainBundle(opts: ExplainBundleOptions): Promise<MergeTrace[]>`

Returns configuration resolution trace without side effects.

**Parameters:**
- `opts.cwd` (`string?`): Workspace root directory
- `opts.product` (`ProductId`): Product identifier
- `opts.profileId` (`string?`): Profile identifier
- `opts.scopeId` (`string?`): Scope identifier
- `opts.cli` (`Record<string, unknown>?`): CLI overrides

**Returns:**
- `Promise<MergeTrace[]>`: Array of configuration merge steps

**Example:**
```typescript
const trace = await explainBundle({
  product: 'aiReview',
  profileId: 'default'
});
```

#### `initAll(opts: InitAllOptions): Promise<InitAllResult>`

Initializes complete KB Labs workspace.

**Parameters:**
- `opts.cwd` (`string`): Workspace root directory
- `opts.format` (`'yaml' | 'json'?`): Config file format (default: `'yaml'`)
- `opts.products` (`ProductId[]?`): Products to initialize
- `opts.presetRef` (`string?`): Preset package reference
- `opts.policyBundle` (`string?`): Policy bundle name
- `opts.dryRun` (`boolean?`): Preview without writing
- `opts.force` (`boolean?`): Overwrite existing files

**Returns:**
- `Promise<InitAllResult>`: Initialization result with stats

#### `clearCaches(): void`

Clears all LRU caches (useful for testing).

### Types & Interfaces

#### `Bundle<T>`

Complete bundle object returned by `loadBundle()`.

```typescript
interface Bundle<T> {
  product: ProductId;
  config: T;
  profile: BundleProfile | null;
  artifacts: {
    summary: Record<string, string[]>;
    list(key: string): Promise<Array<{ relPath: string; sha256: string }>>;
    materialize(keys?: string[]): Promise<MaterializeResult>;
    readText(relPath: string): Promise<string>;
    readJson<T = any>(relPath: string): Promise<T>;
    readAll(key: string): Promise<Array<{ path: string; content: string }>>;
  };
  policy: {
    bundle?: string;
    permits: (action: string, resource?: any) => boolean;
  };
  trace: MergeTrace[];
}
```

#### `LoadBundleOptions`

Options for `loadBundle()` function.

#### `ExplainBundleOptions`

Options for `explainBundle()` function.

#### `InitAllOptions`

Options for `initAll()` function.

#### `InitAllResult`

Result of `initAll()` operation.

### Constants

- `ProductId`: Type alias for supported product identifiers

## 🔧 Configuration

### Configuration Options

Bundle uses the 6-layer configuration system from `@kb-labs/core-config`:

1. **Runtime defaults** - Built-in defaults
2. **Profile defaults** - From profile manifest
3. **Preset defaults** - From org preset package
4. **Workspace config** - From `kb-labs.config.*`
5. **Local config** - From `.kb/<product>/<product>.config.json`
6. **CLI overrides** - From command line arguments

### Environment Variables

- None (all configuration via files and options)

### Default Values

- `profileId`: Uses workspace default profile
- `scopeId`: Uses profile default scope
- `validate`: `false` (no validation)
- `writeFinalConfig`: `false` (doesn't write config)

## 🔗 Dependencies

### Runtime Dependencies

- `@kb-labs/core-config` (`link:`): 6-layer configuration system
- `@kb-labs/core-policy` (`link:`): Policy resolution and enforcement
- `@kb-labs/core-profiles` (`link:`): Profile loading and artifact management
- `@kb-labs/core-sys` (`link:`): Output and system utilities
- `@kb-labs/core-types` (`link:`): TypeScript type definitions
- `glob` (`^11.0.0`): File pattern matching
- `picomatch` (`^4.0.2`): Pattern matching for artifacts

### Development Dependencies

- `@types/node` (`^24.3.3`): Node.js type definitions
- `rimraf` (`^6.0.1`): File removal utility
- `tsup` (`^8.5.0`): TypeScript bundler
- `typescript` (`^5.6.3`): TypeScript compiler
- `vitest` (`^3.2.4`): Test runner

### Internal Dependencies

All dependencies are internal to `kb-labs-core` repository via `link:` protocol.

## 🧪 Testing

### Test Structure

```
src/__tests__/
├── bundle.spec.ts              # Unit tests for loadBundle
├── integration.spec.ts          # Integration tests
└── load-bundle-validation.spec.ts  # Validation tests
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

- **Current Coverage**: ~85%
- **Target Coverage**: 90%
- **Coverage Gaps**: Edge cases in profile resolution

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(n) where n is number of configuration layers
- **Space Complexity**: O(m) where m is cached configuration size
- **Bottlenecks**: File I/O for config/profile loading
- **Optimization Opportunities**: Additional caching for workspace config

### Scalability

- **Horizontal Scaling**: Not applicable (local file system operations)
- **Vertical Scaling**: Limited by file system I/O
- **Limitations**: Single-threaded Node.js execution

## 🔒 Security

### Security Considerations

- **Input Validation**: All inputs validated via Zod schemas
- **Path Traversal**: Workspace root resolution prevents path traversal
- **Profile Security**: Profile loading uses security constraints from `core-profiles`
- **Policy Enforcement**: All operations checked against policy rules

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Single Workspace**: Only supports one workspace root per call
- **Synchronous Artifacts**: Artifact operations are async but sequential
- **Profile v1 Support**: Legacy profile format support may be removed in v1.0

### Future Improvements

- **Parallel Loading**: Load config and profile in parallel
- **Streaming Artifacts**: Support streaming for large artifacts
- **Profile v2 Only**: Remove v1 support in v1.0.0

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- **v1.0.0**: Remove Profiles v1 support (migrate to v2)

## 📚 Examples

### Example 1: Basic Usage

```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  product: 'aiReview'
});

console.log(bundle.config);
```

### Example 2: With Profile Selection

```typescript
const bundle = await loadBundle({
  product: 'aiReview',
  profileId: 'backend',
  scopeId: 'production'
});
```

### Example 3: With Validation

```typescript
const bundle = await loadBundle({
  product: 'aiReview',
  validate: true  // Throws on validation errors
});
```

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs
