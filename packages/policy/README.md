# @kb-labs/core-policy

RBAC-style permission system for KB Labs with permit-all default for good developer experience.

## Features

- **RBAC Model**: Role-based access control with identity and roles
- **Permit-All Default**: Good DX - no policy means everything is allowed
- **Policy Resolution**: Support for preset bundles and workspace overrides
- **Base Actions**: Predefined actions for KB Labs products
- **Schema Validation**: JSON Schema validation with AJV
- **Error Handling**: Standardized errors with helpful hints

## API

### Core Functions

```typescript
import { 
  resolvePolicy, 
  can, 
  createPermitsFunction, 
  requirePermission,
  validatePolicySchema 
} from '@kb-labs/core-policy';

// Resolve policy from preset and workspace
const result = await resolvePolicy({
  presetBundle: 'default@1.0.0',
  workspaceOverrides: workspacePolicy
});

// Check permissions
const identity = { roles: ['admin', 'developer'] };
const allowed = can(policy, identity, 'release.publish');

// Create permits function for specific identity
const permits = createPermitsFunction(policy, identity);
const canPublish = permits('release.publish');

// Require permission (throws if denied)
requirePermission(policy, identity, 'release.publish');
```

### Policy Schema

```json
{
  "$schema": "https://schemas.kb-labs.dev/policy.schema.json",
  "schemaVersion": "1.0",
  "rules": [
    {
      "action": "release.publish",
      "allow": ["admin", "maintainer"]
    },
    {
      "action": "devkit.sync",
      "allow": ["admin", "developer"]
    },
    {
      "action": "aiReview.run",
      "allow": ["admin", "reviewer"]
    },
    {
      "action": "profiles.materialize",
      "allow": ["admin", "developer"]
    }
  ],
  "metadata": {
    "name": "default-policy",
    "version": "1.0.0",
    "description": "Default KB Labs policy"
  }
}
```

### Base Actions

```typescript
import { BASE_ACTIONS } from '@kb-labs/core-policy';

// Predefined actions for KB Labs products
BASE_ACTIONS.RELEASE_PUBLISH    // 'release.publish'
BASE_ACTIONS.DEVKIT_SYNC        // 'devkit.sync'
BASE_ACTIONS.DEVLINK_WATCH      // 'devlink.watch'
BASE_ACTIONS.AI_REVIEW_RUN      // 'aiReview.run'
BASE_ACTIONS.PROFILES_MATERIALIZE // 'profiles.materialize'
```

## Policy Resolution

The system resolves policies in this order:

1. **Default Policy**: Permit-all if no policy configured
2. **Preset Bundle**: Load from npm package (e.g., `@kb-labs/policy-default@1.0.0`)
3. **Workspace Overrides**: Merge with workspace policy from `kb-labs.config.*`

```typescript
// Workspace config example
{
  "policy": {
    "rules": [
      {
        "action": "release.publish",
        "allow": ["admin", "maintainer"]
      }
    ]
  }
}
```

## Permission Rules

### Rule Structure

```typescript
interface PolicyRule {
  action: string;        // Action to control (e.g., 'release.publish')
  resource?: string;     // Optional resource identifier
  allow?: string[];      // Roles that are allowed
  deny?: string[];       // Roles that are explicitly denied
}
```

### Action Patterns

- **Exact match**: `'release.publish'`
- **Wildcard**: `'*'` (matches all actions)
- **Prefix wildcard**: `'release.*'` (matches all release actions)

### Role Patterns

- **Exact match**: `'admin'`
- **Wildcard**: `'*'` (matches all roles)
- **Multiple roles**: `['admin', 'maintainer']`

## Examples

### Basic Usage

```typescript
import { resolvePolicy, can } from '@kb-labs/core-policy';

// Resolve policy
const { policy } = await resolvePolicy({
  presetBundle: 'default@1.0.0'
});

// Check permission
const identity = { roles: ['developer'] };
const canSync = can(policy, identity, 'devkit.sync');
console.log(canSync); // true
```

### Workspace Overrides

```typescript
// kb-labs.config.yaml
{
  "policy": {
    "rules": [
      {
        "action": "release.publish",
        "allow": ["admin", "maintainer", "release-manager"]
      }
    ]
  }
}

// Load with overrides
const { policy } = await resolvePolicy({
  presetBundle: 'default@1.0.0',
  workspaceOverrides: workspacePolicy
});
```

### Permission Enforcement

```typescript
import { requirePermission } from '@kb-labs/core-policy';

try {
  requirePermission(policy, identity, 'release.publish');
  console.log('Permission granted');
} catch (error) {
  if (error instanceof KbError && error.code === 'ERR_FORBIDDEN') {
    console.error('Permission denied:', error.message);
    console.error('Hint:', error.hint);
  }
}
```

### Custom Permits Function

```typescript
import { createPermitsFunction } from '@kb-labs/core-policy';

const identity = { roles: ['admin', 'developer'] };
const permits = createPermitsFunction(policy, identity);

// Use in application
if (permits('release.publish')) {
  await publishRelease();
}

if (permits('devkit.sync')) {
  await syncDevkit();
}
```

## Error Handling

The system provides detailed error information:

```typescript
import { KbError } from '@kb-labs/core-policy';

try {
  requirePermission(policy, identity, 'release.publish');
} catch (error) {
  if (error instanceof KbError) {
    console.error(`Error: ${error.message}`);
    console.error(`Hint: ${error.hint}`);
    console.error(`Code: ${error.code}`);
  }
}
```

## Schema Validation

```typescript
import { validatePolicySchema } from '@kb-labs/core-policy';

const result = validatePolicySchema(policy);
if (!result.valid) {
  console.error('Policy validation failed:', result.errors);
}
```

## Default Behavior

- **No Policy**: Permit all actions (good DX)
- **No Rules**: Permit all actions
- **No Match**: Permit action (fail-safe)
- **Explicit Deny**: Deny action
- **Explicit Allow**: Allow action

## Integration

The policy system integrates with the bundle system:

```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview'
});

// Check permission
if (bundle.policy.permits('aiReview.run')) {
  await runAIReview();
}
```
