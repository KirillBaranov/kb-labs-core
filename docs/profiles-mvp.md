# Profiles MVP Documentation

## Overview

The Profiles MVP provides a minimal working implementation for loading, validating, merging, and resolving KB Labs profiles. This document describes the public API and usage patterns.

## Public API

### Core Functions

- `loadProfile(opts)` - Load profile from file system (I/O only, no validation)
- `validateProfile(profile)` - Validate profile using Ajv + schemas
- `mergeProfiles(base, next)` - Merge profiles with deep merge rules
- `resolveProfile(opts)` - Full profile resolution with extends chain
- `ProfileService` - High-level service class

### Types

- `RawProfile` - Unvalidated profile data
- `ResolvedProfile` - Fully processed profile
- `ResolveOptions` - Options for profile resolution

### Error Classes

- `ProfileNotFoundError` - Profile file not found
- `ExtendResolutionError` - Failed to resolve extends reference
- `SchemaValidationError` - Schema validation failed

## Function Details

### loadProfile(opts)

**Input**: `{ cwd?: string; name?: string; path?: string }`

**Behavior**:
- If `path` is provided, read JSON from that path
- Otherwise, search for `.kb/profiles/<name>/profile.json` from `cwd` (default: `process.cwd()`)
- Returns `{ profile: RawProfile; meta: { pathAbs, repoRoot } }`
- No validation, I/O only
- Logs: debug (path), info (found/not found)

### validateProfile(profile)

**Input**: `RawProfile`

**Behavior**:
- Uses Ajv + `@kb-labs/profile-schemas` for validation
- Validates profile, rules, products/*, io/diff/cap as `$ref`
- Returns `{ ok: true, errors: null } | { ok: false, errors: AjvError[] }`
- Does not throw exceptions - only returns result
- Exception is thrown by `resolveProfile` when `strict=true`

### mergeProfiles(base, next)

**Input**: Two `RawProfile` objects or array of profiles

**Behavior**:
- **Objects**: Deep merge
- **Arrays (rules)**: Concatenation + de-dup by `id`
- **Primitives**: "Last wins"
- Pure function, no I/O

### resolveProfile(opts)

**Input**: `{ cwd?: string; name?: string; product?: 'review'|'tests'|'docs'|'assistant'; strict?: boolean }`

**Steps**:
1. `loadProfile` → build extends graph (supports `@pkg@^1`, `./relative.json` formats)
2. Merge sequentially: extends (left→right) → local profile → overrides
3. Normalize (defaults, key sorting, canonical paths)
4. `validateProfile` of final JSON
5. If `strict && !ok` → throw `SchemaValidationError`
6. Otherwise warn + continue
7. Build `ResolvedProfile`:
   - Fields: `name`, `kind`, `scope`, `version`, `roots[]`, `files[]`, `products`, `rules?`, `meta`
   - Logs: info (result: name/kind/products), debug (detailed files)

### ProfileService

**Methods**:
- `load(name?)` - Load profile by name
- `validate(profile)` - Validate profile
- `resolve({ name, product, strict })` - Resolve profile with options
- `getProductConfig(resolved, product)` - Merge defaults + product override
- `debugDump(resolved)` - Brief report (roots, files, products summary)

**Internal**: Uses existing logger/fs from core

## Merge Order

The profile resolution follows a specific merge order:

1. **Extends chain** (left→right): Profiles listed in `extends` array
2. **Local profile**: The main profile being resolved
3. **Overrides chain** (left→right): Profiles listed in `overrides` array

Each subsequent profile in the chain overrides previous values according to merge rules.

## Strict Policy

- **`strict: true`** (default): Throw `SchemaValidationError` on any validation failure
- **`strict: false`**: Log warnings but continue processing with potentially invalid data

## Usage Examples

### Basic Usage

```typescript
import { resolveProfile, ProfileService } from '@kb-labs/core-profiles';

// Simple resolution
const resolved = await resolveProfile({
  cwd: '/path/to/repo',
  name: 'default',
  strict: true
});

// Using service
const service = new ProfileService({ cwd: '/path/to/repo' });
const resolved = await service.resolve({ strict: true });
```

### Error Handling

```typescript
import { ProfileNotFoundError, SchemaValidationError } from '@kb-labs/core-profiles';

try {
  const resolved = await resolveProfile({ name: 'nonexistent', strict: true });
} catch (error) {
  if (error instanceof ProfileNotFoundError) {
    console.error('Profile not found:', error.where);
  } else if (error instanceof SchemaValidationError) {
    console.error('Validation failed:', error.errors);
  }
}
```

### Non-strict Mode

```typescript
// Continue processing even with validation errors
const resolved = await resolveProfile({
  name: 'profile-with-errors',
  strict: false
});

if (!resolved.meta.validationResult) {
  console.warn('Profile has validation errors but processing continued');
}
```

## Profile Structure

A typical profile structure:

```json
{
  "name": "my-profile",
  "kind": "review",
  "scope": "repo",
  "version": "1.0.0",
  "extends": ["base-profile", "./relative-profile.json"],
  "overrides": ["env-specific-override"],
  "products": {
    "review": {
      "enabled": true,
      "config": "review-config",
      "io": { "maxFiles": 100 },
      "capabilities": { "rag": true }
    }
  },
  "rules": [
    { "id": "rule1", "type": "validation" }
  ],
  "metadata": {
    "description": "Profile description"
  }
}
```
