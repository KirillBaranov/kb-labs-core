# Migration Guide: Using kb-labs-core Config System

## Overview

This guide helps products migrate to the unified configuration system provided by `@kb-labs/core-bundle`. The new system offers:

- **Single Entry Point**: One API (`loadBundle()`) for all configuration, profiles, artifacts, and policy
- **Layered Configuration**: 6-layer merge system (runtime → profile → preset → workspace → local → CLI)
- **Automatic Integration**: Profile defaults, artifacts, and policy are automatically resolved
- **Better DX**: Helpful error messages, suggestions, and detailed trace

## Benefits

1. **Simplified API**: Replace multiple imports with single `loadBundle()` call
2. **Consistent Behavior**: Same configuration resolution for all products
3. **Better Debugging**: Built-in trace to understand configuration layers
4. **Security**: Safe artifact access with whitelisting and size limits
5. **Permissions**: Built-in policy checks
6. **Auto-suggestions**: CLI provides helpful suggestions when issues are detected

## Prerequisites

- Install `@kb-labs/core-bundle` in your product
- Workspace must have `kb-labs.config.yaml` or `kb-labs.config.json`
- Profile configured in workspace config

## Step-by-Step Migration

### 1. Install Dependencies

```bash
pnpm add @kb-labs/core-bundle
```

### 2. Replace Configuration Loading

**Before:**
```typescript
import { loadConfig } from './config';
import { loadRules } from './rules';
import { loadPolicy } from './policy';

const config = await loadConfig(cwd);
const rules = await loadRules(cwd);
const policy = await loadPolicy();
```

**After:**
```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview',
  profileKey: 'default',
  cli: { debug: true }  // Optional CLI overrides
});

const config = bundle.config as AiReviewConfig;
const rules = await bundle.artifacts.list('rules');
const canRun = bundle.policy.permits('aiReview.run');
```

### 3. Update Configuration Structure

**Old Structure** (local config files):
```
project/
├── sentinel.config.yml
├── profiles/
│   └── frontend/
│       ├── rules.yml
│       └── ...
```

**New Structure** (kb-labs-core):
```
project/
├── kb-labs.config.yaml       # Workspace config
├── .kb/
│   ├── lock.json             # Lockfile
│   ├── profiles/
│   │   └── node-ts-lib/
│   │       ├── profile.json
│   │       ├── defaults/
│   │       │   └── ai-review.json
│   │       └── artifacts/
│   │           └── ai-review/
│   │               ├── rules.yml
│   │               └── prompts/
│   └── ai-review/
│       └── ai-review.config.json  # Product-specific config
```

### 4. Handle Artifacts

**Before:**
```typescript
import { readFile } from 'fs/promises';
const rules = await readFile('profiles/frontend/rules.yml', 'utf-8');
```

**After:**
```typescript
// List available artifacts
const rules = await bundle.artifacts.list('rules');
for (const rule of rules) {
  const content = await bundle.artifacts.read(rule.relPath);
  // Process content
}

// Or materialize all artifacts to local cache
await bundle.artifacts.materialize(['rules', 'prompts']);
```

### 5. Update Policy Checks
## Profile Manifest v1.0 and Validation

Profiles support a new manifest format with `schemaVersion: "1.0"`.

Example:

```json
{
  "schemaVersion": "1.0",
  "name": "node-ts-lib",
  "version": "1.0.0",
  "extends": [],
  "exports": { "ai-review": { "rules": "artifacts/ai-review/rules.yml" } },
  "defaults": { "ai-review": { "$ref": "./defaults/ai-review.json" } }
}
```

Validation is integrated:

- At runtime via bundle:

```ts
const bundle = await loadBundle({ cwd, product: 'aiReview', validate: true });
```

- Via CLI:

```bash
kb config validate --product aiReview
```


**Before:**
```typescript
if (canRunAIReview) {
  // ...
}
```

**After:**
```typescript
if (!bundle.policy.permits('aiReview.run')) {
  throw new Error('Permission denied');
}
```

## API Reference

### loadBundle()

```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: string,              // Working directory (default: process.cwd())
  product: ProductId,       // Product ID (required)
  profileKey?: string,      // Profile key (default: 'default')
  cli?: Record<string, any>, // CLI overrides
  writeFinalConfig?: boolean // Write final merged config
});
```

### Bundle Interface

```typescript
interface Bundle {
  product: ProductId;           // Product identifier
  config: unknown;              // Merged configuration (all 6 layers)
  profile: {
    key: string;               // Profile key
    name: string;              // Profile name
    version: string;           // Profile version
    overlays?: string[];       // Profile overlays
  };
  artifacts: {
    summary: Record<string, string[]>;  // Available artifacts by key
    list(key: string): Promise<Array<{ relPath: string; sha256: string }>>;
    materialize(keys?: string[]): Promise<{
      filesCopied: number;
      filesSkipped: number;
      bytesWritten: number;
    }>;
  };
  policy: {
    bundle?: string;            // Policy bundle name
    permits: (action: string, resource?: any) => boolean;
  };
  trace: MergeTrace[];         // Configuration resolution trace
}
```

### ProductId Type

```typescript
type ProductId = 'devlink' | 'release' | 'aiReview' | 'aiDocs' | 'devkit';
```

## Examples by Product

### ai-review

**Before:**
```typescript
import { loadConfig } from './config';
import { loadRules } from './rules';

async function runReview() {
  const config = await loadConfig(process.cwd());
  const rules = await loadRules(process.cwd(), config.profile.name);
  
  // Use config and rules
  if (config.debug) {
    console.log('Running in debug mode');
  }
  
  for (const rule of rules) {
    // Process rules
  }
}
```

**After:**
```typescript
import { loadBundle } from '@kb-labs/core-bundle';

async function runReview() {
  const bundle = await loadBundle({
    cwd: process.cwd(),
    product: 'aiReview',
    profileKey: 'default'
  });
  
  const config = bundle.config as AiReviewConfig;
  
  // Use config
  if (config.debug) {
    console.log('Running in debug mode');
  }
  
  // Access artifacts
  const rules = await bundle.artifacts.list('rules');
  for (const rule of rules) {
    const content = await bundle.artifacts.read(rule.relPath);
    // Process rules
  }
  
  // Check permissions
  if (!bundle.policy.permits('aiReview.run')) {
    throw new Error('Permission denied');
  }
}
```

### devlink

**Before:**
```typescript
const config = readDevlinkConfig();
const mode = config.mode || 'auto';
```

**After:**
```typescript
const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'devlink',
  profileKey: 'default'
});

const config = bundle.config as DevlinkConfig;
const mode = config.mode || 'auto';
```

### mind

**Before:**
```typescript
const config = loadMindConfig();
const indexer = config.indexer || {};
```

**After:**
```typescript
const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'mind',
  profileKey: 'default'
});

const config = bundle.config as MindConfig;
const indexer = config.indexer || {};
```

## Configuration Layers

Configuration is merged from 6 layers (later layers override earlier ones):

1. **Runtime defaults** - Built-in defaults for each product
2. **Profile defaults** - From profile manifest defaults
3. **Preset defaults** - From org preset package (`$extends`)
4. **Workspace config** - From `kb-labs.config.yaml`
5. **Local config** - From `.kb/<product>/<product>.config.json`
6. **CLI overrides** - From command line arguments

Use `bundle.trace` to see how configuration was resolved:

```typescript
console.log('Configuration layers:');
for (const step of bundle.trace) {
  console.log(`${step.layer}: ${step.source}`);
}
```

## Troubleshooting

### Error: "No workspace configuration found"

**Solution:** Run `kb init workspace` to create workspace config.

### Error: "Profile key not found"

**Solution:** Add profile to `kb-labs.config.yaml`:
```yaml
profiles:
  default: "node-ts-lib@1.2.0"
```

### Error: "Profile defaults failed to load"

**Check:**
1. Profile exists at `.kb/profiles/<name>/profile.json`
2. Profile has `defaults` section in manifest
3. Defaults file exists and is valid JSON

### Artifacts not found

**Check:**
1. Profile exports include your product
2. Artifact key matches export key
3. Files exist in profile's artifacts directory

### Permission denied

**Solution:** Update policy in workspace config or use `kb init policy` to set up permissions.

## FAQ

### Q: Can I still use my existing config files?

A: Yes, but they should be moved to the new structure. Local overrides go in `.kb/<product>/<product>.config.json`.

### Q: How do I migrate existing profiles?

A: Run `kb init profile` and it will help scaffold the new profile structure.

### Q: What if I need a custom configuration format?

A: The bundle system is extensible. You can access raw profile data and implement custom logic.

### Q: How do I debug configuration issues?

A: Use `bundle.trace` to see all layers, or run `kb config explain --product <product>`.

### Q: Can I use both old and new systems?

A: Yes, during migration period. Eventually, old system will be deprecated.

### Q: How do I add a new product?

See [ADDING_PRODUCT.md](./docs/ADDING_PRODUCT.md) for details.

## Next Steps

1. Run `kb init setup` to initialize your workspace
2. Migrate your configs to the new structure
3. Update your code to use `loadBundle()`
4. Test thoroughly
5. Remove old configuration code

## Support

For issues or questions:
- See [CONFIG_API.md](./docs/CONFIG_API.md) for full API docs
- Run `kb doctor` to check configuration health
- Check trace output for debugging

