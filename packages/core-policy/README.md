# @kb-labs/core-policy

> **Policy management system for KB Labs, handling rule validation and policy bundles.** Provides RBAC-style permission system with permit-all default for good developer experience.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision & Purpose

**@kb-labs/core-policy** is the policy management system for KB Labs. It provides RBAC-style permission checking with a permit-all default (good developer experience) and support for policy bundles and workspace overrides. The system allows fine-grained permission control for KB Labs products while maintaining ease of use.

### What Problem Does This Solve?

- **Permission Management**: Products need to check permissions for operations - policy provides unified permission system
- **Security**: Some operations need to be restricted - policy provides fine-grained access control
- **Developer Experience**: Default deny makes development difficult - policy uses permit-all default
- **Policy Reusability**: Teams need to share policies - policy supports bundles and workspace overrides

### Why Does This Package Exist?

- **Unified Permission System**: All KB Labs products use the same permission checking logic
- **Security**: Centralized permission enforcement
- **Flexibility**: Support for preset bundles and workspace overrides
- **Developer Experience**: Permit-all default makes development easier

### What Makes This Package Unique?

- **Permit-All Default**: No policy means everything is allowed (good DX)
- **RBAC Model**: Role-based access control with identity and roles
- **Policy Bundles**: Reusable policy packages
- **Workspace Overrides**: Workspace-specific policy overrides

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

- **Test Coverage**: ~80% (target: 90%)
- **TypeScript Coverage**: 100% (target: 100%)
- **Documentation Coverage**: 75% (target: 100%)
- **API Stability**: Stable
- **Breaking Changes**: None in last 6 months
- **Last Major Version**: 0.1.0
- **Next Major Version**: 1.0.0

### Production Readiness

- [x] **API Stability**: API is stable
- [x] **Error Handling**: Comprehensive error handling
- [x] **Logging**: Structured error reporting
- [x] **Testing**: Unit tests present
- [x] **Performance**: Efficient permission checking
- [x] **Security**: Permission enforcement
- [x] **Documentation**: API documentation and examples
- [x] **Migration Guide**: N/A (no breaking changes)

## 🏗️ Architecture

### High-Level Architecture

The policy package implements RBAC permission system:

```
Policy System
    │
    ├──► Policy Resolution (preset + workspace)
    ├──► Permission Checking (RBAC)
    ├──► Schema Validation (AJV)
    └──► Permit Function Creation
```

### Core Components

#### Policy Resolution

- **Purpose**: Resolve policy from preset bundles and workspace overrides
- **Responsibilities**: Load policy bundles, merge overrides, validate schema
- **Dependencies**: `core-config`, `ajv`

#### Permission Checking

- **Purpose**: Check if identity has permission for action
- **Responsibilities**: RBAC evaluation, role matching, action matching
- **Dependencies**: None (pure logic)

### Design Patterns

- **RBAC Pattern**: Role-based access control
- **Strategy Pattern**: Different permission evaluation strategies
- **Factory Pattern**: Permit function creation

### Data Flow

```
resolvePolicy({ presetBundle, workspaceOverrides })
    │
    ├──► Load preset bundle (if specified)
    ├──► Merge workspace overrides
    ├──► Validate schema
    └──► return Policy

can(policy, identity, action)
    │
    ├──► Extract roles from identity
    ├──► Find matching rules
    ├──► Evaluate allow/deny
    └──► return boolean
```

## 🚀 Quick Start

### Installation

```bash
pnpm add @kb-labs/core-policy
```

### Basic Usage

```typescript
import { resolvePolicy, createPermitsFunction } from '@kb-labs/core-policy';

const policy = await resolvePolicy({
  presetBundle: 'default@1.0.0',
  workspaceOverrides: workspacePolicy
});

const identity = { roles: ['admin', 'developer'] };
const permits = createPermitsFunction(policy, identity);

if (permits('release.publish')) {
  await publishRelease();
}
```

## ✨ Features

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

## 📦 API Reference

### Main Exports

#### `resolvePolicy(opts: PolicyResolutionOptions): Promise<PolicyResolutionResult>`

Resolves policy from preset bundle and workspace overrides.

**Parameters:**
- `opts.presetBundle` (`string?`): Preset policy bundle name
- `opts.workspaceOverrides` (`Policy?`): Workspace policy overrides

**Returns:**
- `Promise<PolicyResolutionResult>`: Resolved policy with bundle name

#### `can(policy: Policy, identity: Identity, action: string, resource?: string): boolean`

Checks if identity has permission for action.

**Parameters:**
- `policy`: Policy object
- `identity`: Identity with roles
- `action`: Action to check
- `resource`: Optional resource identifier

**Returns:**
- `boolean`: True if permitted, false otherwise

#### `createPermitsFunction(policy: Policy, identity: Identity): (action: string, resource?: string) => boolean`

Creates a permits function for specific identity.

**Parameters:**
- `policy`: Policy object
- `identity`: Identity with roles

**Returns:**
- Function that checks permissions for the identity

#### `requirePermission(policy: Policy, identity: Identity, action: string, resource?: string): void`

Requires permission, throws if denied.

**Parameters:**
- `policy`: Policy object
- `identity`: Identity with roles
- `action`: Action to check
- `resource`: Optional resource identifier

**Throws:**
- `KbError`: If permission denied

### Types & Interfaces

#### `Policy`

```typescript
interface Policy {
  rules: PolicyRule[];
  metadata?: {
    name?: string;
    version?: string;
    description?: string;
  };
}
```

#### `PolicyRule`

```typescript
interface PolicyRule {
  action: string;
  resource?: string;
  allow?: string[];
  deny?: string[];
}
```

#### `Identity`

```typescript
interface Identity {
  roles: string[];
}
```

## 🔧 Configuration

### Configuration Options

Policy resolution order:
1. **Default Policy**: Permit-all if no policy
2. **Preset Bundle**: Load from npm package
3. **Workspace Overrides**: Merge with workspace policy

### Environment Variables

- None (all configuration via policy bundles and workspace config)

## 🔗 Dependencies

### Runtime Dependencies

- `@kb-labs/core-config` (`link:`): Policy bundle resolution
- `ajv` (`^8.17.1`): JSON schema validation
- `ajv-formats` (`^3.0.1`): Additional formats

### Development Dependencies

- `@types/node` (`^24.3.3`): Node.js types
- `tsup` (`^8.5.0`): TypeScript bundler
- `typescript` (`^5.6.3`): TypeScript compiler
- `vitest` (`^3.2.4`): Test runner

## 🧪 Testing

### Test Structure

```
src/__tests__/
├── init-policy.spec.ts
└── policy.spec.ts
```

### Test Coverage

- **Current Coverage**: ~80%
- **Target Coverage**: 90%

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(n) where n = number of rules
- **Space Complexity**: O(1) (minimal state)
- **Bottlenecks**: Rule matching (linear search)

## 🔒 Security

### Security Considerations

- **Permission Enforcement**: All operations checked against policy
- **Default Permit**: Permit-all default (good DX, but may need review)
- **Explicit Deny**: Deny rules take precedence

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Linear Rule Matching**: Rules checked sequentially (could be optimized)
- **No Resource-Level Permissions**: Resource parameter exists but not fully implemented

### Future Improvements

- **Optimized Rule Matching**: Index rules for faster lookup
- **Resource-Level Permissions**: Full resource-based access control

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- None planned

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs
