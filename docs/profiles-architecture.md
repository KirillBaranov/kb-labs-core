# Profiles Architecture

## Overview

The Profiles system provides a flexible configuration management solution for KB Labs products. It supports inheritance, validation, system defaults, and runtime metadata collection.

## Pipeline

The profile resolution follows a strict order:

```
SYSTEM_DEFAULTS → extends (left→right) → local profile → overrides (left→right) → validate → apply defaults
```

### 1. System Defaults
Global minimum values applied first:
- `io`: Empty allow/deny arrays, no symlinks
- `diff`: Empty include/exclude arrays  
- `capabilities`: All flags disabled, empty tools array

### 2. Extends Chain
Profiles listed in `extends` array, processed left to right. Supports:
- Relative paths: `./base-profile.json`
- Profile names: `base-profile` (searched in same directory)
- Package references: `@pkg@^1` (planned)

### 3. Local Profile
The main profile being resolved.

### 4. Overrides Chain
Profiles listed in `overrides` array, processed left to right.

### 5. Validation
Schema validation using Ajv + `@kb-labs/profile-schemas`.

### 6. Apply System Defaults
Missing `io`, `diff`, `capabilities` fields are filled from `SYSTEM_DEFAULTS`.

## Runtime Metadata

Each resolved profile includes `meta.extra` with:

```typescript
{
  createdAt: string;           // ISO timestamp
  resolver: {
    version: string;           // "0.1.0"
    strict: boolean;           // validation strictness
    logLevel: string;          // from KB_PROFILES_LOG_LEVEL
  };
  source: {
    cwd: string;               // working directory
    pathAbs: string;           // absolute path to profile
    repoRoot: string;          // repository root
  };
  chains: {
    extends: string[];         // extends references
    overrides: string[];       // overrides references
  };
  counts: {
    files: number;             // number of mounted files
  };
  trace: {
    stages?: {
      load?: number;           // load time in ms
      merge?: number;          // merge time in ms
      validate?: number;       // validation time in ms
    };
  };
}
```

## Logging Levels

Controlled by `KB_PROFILES_LOG_LEVEL` environment variable:

- `silent`: No logs
- `error`: Errors only
- `warn`: Warnings and errors
- `info`: Info, warnings, errors (default)
- `debug`: All logs including:
  - Profile loading details
  - Extends/overrides chain counts
  - Validation results with timing
  - Stage timings breakdown

## Usage Examples

### Basic Resolution
```typescript
import { resolveProfile } from '@kb-labs/core';

const profile = await resolveProfile({
  cwd: '/path/to/repo',
  name: 'default',
  strict: true
});
```

### Service Usage
```typescript
import { ProfileService } from '@kb-labs/core';

const service = new ProfileService({ 
  cwd: '/path/to/repo',
  strict: true 
});

const profile = await service.resolve({ name: 'production' });
const productConfig = service.getProductConfig(profile, 'review');
```

### Caching
```typescript
// First call - loads and caches
const profile1 = await service.resolveCached({ name: 'default' });

// Second call - returns from cache
const profile2 = await service.resolveCached({ name: 'default' });

// Clear cache
service.clearCache();
```

## Error Handling

- `ProfileNotFoundError`: Profile file doesn't exist
- `ExtendResolutionError`: Failed to resolve extends reference
- `SchemaValidationError`: Schema validation failed (only in strict mode)

In non-strict mode, validation errors are logged but processing continues.
