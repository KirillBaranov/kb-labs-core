# Adding a New Product to Config System

## Overview

This guide explains how to add a new product to the KB Labs configuration system. Products are defined by their `ProductId` and have associated runtime defaults, file system mappings, and optionally profile exports.

## Steps

### 1. Add ProductId to Union Type

**File:** `packages/config/src/types/types.ts`

```typescript
// ProductId - можно расширять добавлением новых продуктов
export type ProductId = 
  | 'devlink' 
  | 'release' 
  | 'aiReview' 
  | 'aiDocs' 
  | 'devkit'
  | 'mind';  // ✅ Add your product here
```

### 2. Add Runtime Defaults

**File:** `packages/config/src/api/product-config.ts`

```typescript
function getRuntimeDefaults(product: ProductId): any {
  const defaults: Record<ProductId, any> = {
    devlink: {
      watch: true,
      build: true,
    },
    release: {
      version: '1.0.0',
      publish: false,
    },
    aiReview: {
      enabled: true,
      rules: [],
    },
    aiDocs: {
      enabled: true,
      templates: [],
    },
    devkit: {
      sync: true,
      check: true,
    },
    // ✅ Add your product defaults
    mind: {
      indexer: {
        enabled: true,
        maxFiles: 10000
      },
      query: {
        cacheMode: 'local'
      }
    }
  };
  
  return defaults[product] || {};
}
```

### 3. Add File System Mapping

**File:** `packages/config/src/utils/product-normalize.ts`

```typescript
export function toFsProduct(product: ProductId): string {
  const map: Record<ProductId, string> = {
    devlink: 'devlink',
    release: 'release',
    aiReview: 'ai-review',
    aiDocs: 'ai-docs',
    devkit: 'devkit',
    // ✅ Add your product mapping
    mind: 'mind'
  };
  return map[product] || product;
}
```

### 4. Create Profile with Product Exports

**File:** `.kb/profiles/<profile-name>/profile.json` (in workspace)

```json
{
  "$schema": "https://schemas.kb-labs.dev/profile/profile.schema.json",
  "schemaVersion": "1.0",
  "name": "node-ts-lib",
  "version": "1.2.0",
  "exports": {
    "mind": {
      "presets": "artifacts/mind/presets/**",
      "templates": "artifacts/mind/templates/**",
      "configs": "artifacts/mind/configs/*.json"
    }
  },
  "defaults": {
    "mind": {
      "$ref": "./defaults/mind.json"
    }
  }
}
```

### 5. (Optional) Add Product-Specific Policy Actions

**File:** `packages/policy/src/schema/policy-schema.ts` (if applicable)

```typescript
// Add product-specific actions
export const PRODUCT_ACTIONS = {
  aiReview: ['aiReview.run', 'aiReview.configure'],
  devlink: ['devlink.apply', 'devlink.watch'],
  // ✅ Add your product actions
  mind: ['mind.index', 'mind.query', 'mind.pack']
};
```

## Complete Example: Adding 'mind' Product

### Step 1: Update ProductId

```typescript
// packages/config/src/types/types.ts
export type ProductId = 
  | 'devlink' 
  | 'release' 
  | 'aiReview' 
  | 'aiDocs' 
  | 'devkit'
  | 'mind';
```

### Step 2: Add Runtime Defaults

```typescript
// packages/config/src/api/product-config.ts
const defaults: Record<ProductId, any> = {
  // ...existing products
  mind: {
    indexer: {
      enabled: true,
      maxFiles: 10000,
      cacheDir: '.kb/mind/cache'
    },
    query: {
      cacheMode: 'local',
      timeout: 5000
    },
    pack: {
      maxTokens: 100000,
      compress: true
    }
  }
};
```

### Step 3: Add FS Mapping

```typescript
// packages/config/src/utils/product-normalize.ts
const map: Record<ProductId, string> = {
  // ...existing mappings
  mind: 'mind'
};
```

### Step 4: Create Profile

```json
{
  "schemaVersion": "1.0",
  "name": "node-ts-lib",
  "version": "1.2.0",
  "exports": {
    "mind": {
      "indexer-configs": "artifacts/mind/indexer/*.json",
      "query-presets": "artifacts/mind/presets/**",
      "pack-templates": "artifacts/mind/templates/**"
    }
  },
  "defaults": {
    "mind": {
      "$ref": "./defaults/mind.json"
    }
  }
}
```

**File:** `.kb/profiles/node-ts-lib/defaults/mind.json`

```json
{
  "indexer": {
    "enabled": true,
    "watch": true
  },
  "query": {
    "cacheTTL": 60
  }
}
```

### Step 5: Test Integration

```typescript
// In your product code
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'mind',
  profileKey: 'default'
});

const config = bundle.config as MindConfig;
console.log(config.indexer.maxFiles); // 10000 (from runtime defaults)
console.log(config.indexer.enabled);  // true (from profile defaults or merged)

const presets = await bundle.artifacts.list('query-presets');
await bundle.artifacts.materialize(['query-presets']);
```

## Checklist

- [ ] Added ProductId to union type
- [ ] Added runtime defaults
- [ ] Added file system mapping
- [ ] Created profile with product exports
- [ ] Created defaults file
- [ ] (Optional) Added policy actions
- [ ] Tested with `loadBundle()`
- [ ] Updated documentation

## Notes

- Runtime defaults provide base values when no other configuration exists
- File system mapping controls where config files are stored
- Profile exports define which artifacts are available
- Profile defaults provide product-specific configuration
- All products automatically benefit from the 6-layer merge system

