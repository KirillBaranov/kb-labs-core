# @kb-labs/core-profiles

Enhanced profile system for KB Labs with new manifest format, artifacts API, and extends resolution.

## Features

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
