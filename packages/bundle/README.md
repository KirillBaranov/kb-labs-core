# @kb-labs/core-bundle

Facade package for KB Labs bundle system that orchestrates config, profiles, artifacts, and policy.

## Features

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
