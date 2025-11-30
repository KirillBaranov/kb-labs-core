# @kb-labs/core-profiles

> **Profiles v2 system for KB Labs, providing environment-based configuration profiles with scopes, artifacts, and security constraints.** Manages profile manifests, artifact loading, and profile composition with cycle detection.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision & Purpose

**@kb-labs/core-profiles** is the profile management system for KB Labs. It provides Profiles v2 with a new manifest format, artifact management, profile composition via `extends`, and security constraints. Profiles allow teams to define reusable configurations with artifacts (files) that can be materialized into workspaces.

### What Problem Does This Solve?

- **Configuration Reusability**: Teams need to share configurations across projects - profiles provide reusable configuration packages
- **Artifact Management**: Products need files (rules, prompts, templates) - profiles provide artifact management with security
- **Environment-Specific Configs**: Different environments need different configs - profiles support scopes for environment-specific overrides
- **Profile Composition**: Profiles should be composable - profiles support `extends` for composition
- **Security**: Artifacts need security constraints - profiles enforce whitelist, size limits, and SHA256 verification

### Why Does This Package Exist?

- **Unified Profile System**: All KB Labs products use the same profile system
- **Security**: Centralized security constraints for artifact loading
- **Reusability**: Profiles can be shared via npm packages
- **Composition**: Profiles can extend other profiles for reuse

### What Makes This Package Unique?

- **Profiles v2 Format**: New manifest format with `exports`, `defaults`, and `scopes`
- **Artifact Security**: Whitelist, size limits, SHA256 verification
- **Cycle Detection**: Prevents infinite profile extends chains
- **Idempotent Materialization**: SHA-based skip for unchanged files

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
- **Documentation Coverage**: 80% (target: 100%)
- **API Stability**: Stable
- **Breaking Changes**: None in last 6 months
- **Last Major Version**: 0.1.0
- **Next Major Version**: 1.0.0 (remove v1 support)

### Production Readiness

- [x] **API Stability**: API is stable
- [x] **Error Handling**: Comprehensive error handling
- [x] **Logging**: Structured logging via core-sys
- [x] **Testing**: Unit tests, integration tests present
- [x] **Performance**: LRU caching implemented
- [x] **Security**: Security constraints enforced
- [x] **Documentation**: API documentation and examples
- [x] **Migration Guide**: Supports both v1 and v2

## 🏗️ Architecture

### High-Level Architecture

The profiles package manages profile manifests and artifacts:

```
Profile System
    │
    ├──► Profile Loading (from npm or local)
    ├──► Extends Resolution (with cycle detection)
    ├──► Artifact Management (list, read, materialize)
    └──► Security Constraints (whitelist, size limits, SHA256)
```

### Core Components

#### Profile Loading

- **Purpose**: Load profile manifests from npm or local filesystem
- **Responsibilities**: Parse manifest, validate schema, resolve extends
- **Dependencies**: `core-config` for profile resolution

#### Artifact Management

- **Purpose**: Manage profile artifacts (files)
- **Responsibilities**: List artifacts, read content, materialize to filesystem
- **Dependencies**: `glob`, `picomatch` for pattern matching

#### Security Constraints

- **Purpose**: Enforce security for artifact operations
- **Responsibilities**: Whitelist validation, size limits, SHA256 verification
- **Dependencies**: None

### Design Patterns

- **Factory Pattern**: Profile creation from manifests
- **Strategy Pattern**: Different artifact loading strategies
- **Cache Pattern**: LRU cache for artifact metadata

### Data Flow

```
loadProfile({ name, cwd })
    │
    ├──► Resolve profile location (npm/local)
    ├──► Load manifest file
    ├──► Validate schema
    ├──► Resolve extends (with cycle detection)
    ├──► Extract profile info
    └──► return ProfileInfo
```

## 🚀 Quick Start

### Installation

```bash
pnpm add @kb-labs/core-profiles
```

### Basic Usage

```typescript
import { loadProfile, listArtifacts } from '@kb-labs/core-profiles';

const profile = await loadProfile({
  name: 'node-ts-lib@1.2.0',
  cwd: process.cwd()
});

const artifacts = await listArtifacts(profile.profileInfo, {
  product: 'ai-review',
  key: 'rules'
});
```

## ✨ Features

- **New Manifest Format**: Schema version 1.0 with `exports`, `defaults`, and `extends`
- **Artifacts API**: List, read, and materialize profile artifacts with security constraints
- **Extends Resolution**: Profile composition with cycle detection (max depth 8)
- **Security**: Artifact whitelist, sandbox protection, file size limits (1MB), max files per key (100)
- **Idempotent Materialization**: SHA-based skip for unchanged files
- **POSIX Paths**: Windows-compatible path handling
- **LRU Caching**: Artifact metadata caching with `clearCaches()`

## API

### Core Functions

```typescript
import { 
  normalizeManifest,
  extractProfileInfo,
  listArtifacts,
  readArtifact,
  materializeArtifacts,
  getProductDefaults,
  resolveExtends,
  clearCaches
} from '@kb-labs/core-profiles';

// Normalize profile manifest (supports old format with deprecation warning)
const manifest = normalizeManifest(rawProfile);
const profileInfo = extractProfileInfo(manifest, manifestPath);

// List artifacts for a product
const artifacts = await listArtifacts(profileInfo, {
  product: 'ai-review',
  key: 'rules'
});

// Read artifact with SHA256 verification
const { data, sha256 } = await readArtifact(profileInfo, 'artifacts/ai-review/rules.yml');

// Materialize artifacts to destination
const result = await materializeArtifacts(
  profileInfo,
  'ai-review',
  '/path/to/dest',
  ['rules', 'prompts']
);

// Get product defaults
const defaults = await getProductDefaults(profileInfo, 'ai-review', schema);

// Resolve extends with cycle detection
const extendedProfiles = await resolveExtends(profileInfo, loadProfile);

// Clear caches
clearCaches();
```

### Profile Manifest (v1.0)

```json
{
  "$schema": "https://schemas.kb-labs.dev/profile/profile.schema.json",
  "schemaVersion": "1.0",
  "name": "node-ts-lib",
  "version": "1.2.0",
  "extends": ["@kb-labs/profile-base@^1.0.0"],
  "overrides": ["./local-rules.yml"],
  "exports": {
    "ai-review": {
      "rules": "artifacts/ai-review/rules.yml",
      "prompts": "artifacts/ai-review/prompts/**"
    },
    "ai-docs": {
      "templates": "artifacts/ai-docs/templates/**"
    }
  },
  "defaults": {
    "ai-review": { "$ref": "./defaults/ai-review.json" },
    "ai-docs": { "$ref": "./defaults/ai-docs.json" }
  },
  "discovery": {
    "packages": ["packages/*"],
    "languages": ["typescript", "javascript"]
  },
  "metadata": {
    "description": "Node.js TypeScript library profile"
  }
}
```

### Artifacts API

```typescript
// List artifacts with security constraints
const artifacts = await listArtifacts(profile, {
  product: 'ai-review',
  key: 'rules'
});

// Each artifact includes:
interface ArtifactMetadata {
  absPath: string;    // Absolute file path
  relPath: string;    // Relative path from profile root
  sha256: string;     // SHA256 hash
  size: number;       // File size in bytes
  mime: string;       // MIME type
}

// Read artifact with different formats
const { data, sha256 } = await readArtifact(profile, 'rules.yml');
const { text, sha256 } = await readArtifactText(profile, 'rules.yml');
const { data, sha256 } = await readArtifactJson(profile, 'config.json');
const { data, sha256 } = await readArtifactYaml(profile, 'config.yml');

// Verify artifact integrity
const isValid = await verifyArtifactSha256(profile, 'rules.yml', expectedSha256);
```

### Materialization

```typescript
// Materialize artifacts with idempotent behavior
const result = await materializeArtifacts(
  profile,
  'ai-review',
  '/path/to/dest',
  ['rules', 'prompts'] // optional: specific keys
);

// Result includes:
interface MaterializeResult {
  filesCopied: number;      // Files that were copied
  filesSkipped: number;     // Files that were skipped (unchanged)
  bytesWritten: number;     // Total bytes written
  outputs: string[];        // Relative paths of copied files
  manifest: Record<string, { relPath: string; sha256: string; size: number }>;
}

// Check if materialization is needed
const needsUpdate = await needsMaterialization(profile, 'ai-review', '/path/to/dest');

// Clear materialized artifacts
await clearMaterializedArtifacts('/path/to/dest');
```

### Extends Resolution

```typescript
// Resolve profile extends with cycle detection
const extendedProfiles = await resolveExtends(profile, loadProfile);

// Merge exports from extended profiles
const mergedExports = mergeProfileExports(baseProfile, extendedProfiles);

// Validate extends references
validateExtends(['@kb-labs/profile-base@^1.0.0', './local-profile']);
```

## Security

The system enforces several security constraints:

- **File Whitelist**: Only `.yml`, `.yaml`, `.md`, `.txt`, `.json` files allowed
- **Sandbox Protection**: No `..` path escapes beyond profile root
- **Size Limits**: 1MB per file maximum
- **File Count Limits**: 100 files per key maximum
- **Cycle Detection**: Maximum extends depth of 8 levels

## Caching

Artifact metadata is cached for performance:

```typescript
// Clear all caches
clearCaches();

// Get cache statistics
const stats = artifactCache.getStats();
console.log(`Cache size: ${stats.size}, MIME cache: ${stats.mimeSize}`);
```

## Error Handling

The system provides detailed error information:

```typescript
import { KbError } from '@kb-labs/core-profiles';

try {
  const artifacts = await listArtifacts(profile, descriptor);
} catch (error) {
  if (error instanceof KbError) {
    console.error(`Error: ${error.message}`);
    console.error(`Hint: ${error.hint}`);
    console.error(`Code: ${error.code}`);
  }
}
```

## Migration from Old Format

The system supports both old and new manifest formats:

```typescript
// Old format (deprecated)
const oldProfile = {
  name: "node-ts-lib",
  version: "1.2.0",
  products: {
    "ai-review": {
      config: "artifacts/ai-review/config.yml",
      rules: "artifacts/ai-review/rules.yml"
    }
  }
};

// Automatically normalized to new format
const manifest = normalizeManifest(oldProfile);
// Emits deprecation warning
```

## Examples

### Basic Profile Usage

```typescript
import { normalizeManifest, extractProfileInfo, listArtifacts } from '@kb-labs/core-profiles';

// Load and normalize profile
const rawProfile = JSON.parse(await fsp.readFile('profile.json', 'utf-8'));
const manifest = normalizeManifest(rawProfile);
const profileInfo = extractProfileInfo(manifest, 'profile.json');

// List artifacts
const rules = await listArtifacts(profileInfo, {
  product: 'ai-review',
  key: 'rules'
});

console.log(`Found ${rules.length} rule files`);
```

### Materialization Workflow

```typescript
import { materializeArtifacts, needsMaterialization } from '@kb-labs/core-profiles';

const destDir = '/path/to/.kb/ai-review';

// Check if materialization is needed
if (await needsMaterialization(profile, 'ai-review', destDir)) {
  const result = await materializeArtifacts(profile, 'ai-review', destDir);
  console.log(`Materialized ${result.filesCopied} files, skipped ${result.filesSkipped}`);
}
```

### Extends Resolution

```typescript
import { resolveExtends, mergeProfileExports } from '@kb-labs/core-profiles';

// Resolve extends chain
const extendedProfiles = await resolveExtends(profile, loadProfile);

// Merge exports (last wins)
const mergedExports = mergeProfileExports(profile, extendedProfiles);
```

## 📦 API Reference

### Main Exports

#### `loadProfile(opts: LoadProfileOptions): Promise<ProfileResult>`

Loads profile manifest from npm or local filesystem.

**Parameters:**
- `opts.name` (`string`): Profile name (npm package or local path)
- `opts.cwd` (`string`): Workspace root directory

**Returns:**
- `Promise<ProfileResult>`: Profile with manifest and metadata

#### `listArtifacts(profileInfo: ProfileInfo, descriptor: ArtifactDescriptor): Promise<ArtifactMetadata[]>`

Lists artifacts for a product and key.

**Parameters:**
- `profileInfo`: Profile information
- `descriptor.product` (`string`): Product identifier
- `descriptor.key` (`string`): Artifact key

**Returns:**
- `Promise<ArtifactMetadata[]>`: Array of artifact metadata

#### `materializeArtifacts(profileInfo, product, destDir, keys?): Promise<MaterializeResult>`

Materializes artifacts to destination directory.

**Parameters:**
- `profileInfo`: Profile information
- `product` (`string`): Product identifier
- `destDir` (`string`): Destination directory
- `keys` (`string[]?`): Optional specific keys to materialize

**Returns:**
- `Promise<MaterializeResult>`: Materialization result with stats

### Types & Interfaces

#### `ProfileInfo`

```typescript
interface ProfileInfo {
  manifest: ProfileV2;
  exports: Record<string, Record<string, string | string[]>>;
  defaults: Record<string, unknown>;
  meta: ProfileMeta;
}
```

#### `ArtifactMetadata`

```typescript
interface ArtifactMetadata {
  absPath: string;
  relPath: string;
  sha256: string;
  size: number;
  mime: string;
}
```

## 🔧 Configuration

### Configuration Options

- **Profile Location**: npm package or local path
- **Extends Depth**: Maximum 8 levels (cycle detection)
- **Artifact Limits**: 1MB per file, 100 files per key
- **Allowed Extensions**: `.yml`, `.yaml`, `.md`, `.txt`, `.json`

### Environment Variables

- None (all configuration via profile manifests)

## 🔗 Dependencies

### Runtime Dependencies

- `@kb-labs/core-config` (`link:`): Profile resolution
- `@kb-labs/core-types` (`link:`): TypeScript types
- `@kb-labs/core-sys` (`link:`): Logging and utilities
- `ajv` (`^8.17.1`): JSON schema validation
- `ajv-formats` (`^3.0.1`): Additional formats
- `glob` (`^10.3.10`): File pattern matching
- `picomatch` (`^4.0.2`): Pattern matching
- `yaml` (`^2.8.0`): YAML parsing

### Development Dependencies

- `@types/node` (`^24.3.3`): Node.js types
- `tsup` (`^8.5.0`): TypeScript bundler
- `typescript` (`^5.6.3`): TypeScript compiler
- `vitest` (`^3.2.4`): Test runner

## 🧪 Testing

### Test Structure

```
src/__tests__/
├── artifacts.spec.ts
├── core-integration.spec.ts
├── factory.smoke.spec.ts
├── loader.spec.ts
├── resolver.spec.ts
├── resolver.smoke.spec.ts
├── user-example.spec.ts
├── validator-v1.spec.ts
└── validator.spec.ts
```

### Test Coverage

- **Current Coverage**: ~85%
- **Target Coverage**: 90%

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(n) where n = artifact count
- **Space Complexity**: O(m) where m = cached artifact metadata
- **Bottlenecks**: File I/O for artifact reading

## 🔒 Security

### Security Considerations

- **File Whitelist**: Only allowed extensions
- **Path Traversal**: Sandbox protection
- **Size Limits**: 1MB per file
- **SHA256 Verification**: Artifact integrity

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Profile v1 Support**: Legacy format support may be removed in v1.0
- **Artifact Size**: 1MB limit per file
- **File Count**: 100 files per key limit

### Future Improvements

- **Profile v2 Only**: Remove v1 support in v1.0.0
- **Streaming Artifacts**: Support streaming for large artifacts

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- **v1.0.0**: Remove Profiles v1 support (migrate to v2)

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs
