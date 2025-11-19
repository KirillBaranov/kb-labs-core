# @kb-labs/core-types

> **Shared TypeScript type definitions for KB Labs core packages.** Provides common types used across all KB Labs packages for consistency and type safety.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision & Purpose

**@kb-labs/core-types** provides shared TypeScript type definitions for KB Labs core packages. It ensures type consistency across the ecosystem and provides a single source of truth for common types like `ProductId`.

### What Problem Does This Solve?

- **Type Consistency**: Packages need consistent types - core-types provides shared types
- **Type Safety**: Avoid type mismatches between packages - core-types ensures compatibility
- **Single Source of Truth**: Product IDs and other constants should be defined once - core-types centralizes them
- **Code Reuse**: Avoid duplicating type definitions - core-types provides reusable types

### Why Does This Package Exist?

- **Unified Types**: All KB Labs packages use the same type definitions
- **Type Safety**: Ensures type compatibility across packages
- **Maintainability**: Single place to update types
- **Consistency**: Prevents type drift between packages

### What Makes This Package Unique?

- **Minimal Dependencies**: No runtime dependencies (types only)
- **Core Types**: Essential types for KB Labs ecosystem
- **Type Safety**: Strong typing for product IDs and other constants

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

- **Test Coverage**: N/A (types only, no runtime code)
- **TypeScript Coverage**: 100% (target: 100%)
- **Documentation Coverage**: 80% (target: 100%)
- **API Stability**: Stable
- **Breaking Changes**: None in last 6 months
- **Last Major Version**: 0.1.0
- **Next Major Version**: 1.0.0

### Production Readiness

- [x] **API Stability**: Types are stable
- [x] **Error Handling**: N/A (types only)
- [x] **Logging**: N/A (types only)
- [x] **Testing**: Type checking via TypeScript
- [x] **Performance**: N/A (compile-time only)
- [x] **Security**: N/A (types only)
- [x] **Documentation**: Type documentation
- [x] **Migration Guide**: N/A (no breaking changes)

## 🏗️ Architecture

### High-Level Architecture

The types package provides type definitions:

```
Type Definitions
    │
    ├──► ProductId (union type)
    └──► Other shared types
```

### Core Components

#### Type Definitions

- **Purpose**: Define shared types
- **Responsibilities**: Export types for use in other packages
- **Dependencies**: None (types only)

### Design Patterns

- **Type Library Pattern**: Centralized type definitions
- **Union Types**: ProductId as union type for type safety

### Data Flow

```
Import from @kb-labs/core-types
    │
    ├──► TypeScript compiler resolves types
    ├──► Types available at compile time
    └──► No runtime code
```

## 🚀 Quick Start

### Installation

```bash
pnpm add @kb-labs/core-types
```

### Basic Usage

```typescript
import type { ProductId } from '@kb-labs/core-types';

function processProduct(product: ProductId) {
  // Type-safe product handling
  switch (product) {
    case 'aiReview':
      // ...
      break;
    case 'aiDocs':
      // ...
      break;
  }
}
```

## ✨ Features

### Type Definitions

- **ProductId**: Union type for all KB Labs products
- **Type Safety**: Strong typing prevents invalid values
- **Consistency**: Single source of truth for product IDs

## 📦 API Reference

### Main Exports

#### `ProductId`

Union type for all KB Labs products:

```typescript
type ProductId = 'devlink' | 'release' | 'aiReview' | 'aiDocs' | 'devkit' | 'analytics';
```

**Usage:**
```typescript
import type { ProductId } from '@kb-labs/core-types';

const product: ProductId = 'aiReview'; // ✅ Valid
const invalid: ProductId = 'unknown'; // ❌ Type error
```

### Types & Interfaces

All types are exported from the main entry point:

```typescript
import type { ProductId } from '@kb-labs/core-types';
```

## 🔧 Configuration

### Configuration Options

No configuration needed (types only).

### Environment Variables

None (compile-time only).

## 🔗 Dependencies

### Runtime Dependencies

None (types only, no runtime code).

### Development Dependencies

- `@kb-labs/devkit` (`link:`): DevKit presets
- `@types/node` (`^24.3.3`): Node.js types
- `tsup` (`^8.5.0`): TypeScript bundler
- `typescript` (`^5.6.3`): TypeScript compiler
- `vitest` (`^3.2.4`): Test runner

## 🧪 Testing

### Test Structure

No runtime tests (types only). Type checking is done via TypeScript compiler.

### Type Checking

```bash
# Type check
pnpm type-check

# Build (includes type checking)
pnpm build
```

## 📈 Performance

### Performance Characteristics

- **Compile Time**: Minimal (types only)
- **Runtime**: No runtime code (zero overhead)
- **Bundle Size**: Minimal (types stripped in production)

## 🔒 Security

### Security Considerations

- **Type Safety**: Prevents invalid values at compile time
- **No Runtime Code**: No security vulnerabilities possible

### Known Vulnerabilities

- None (types only)

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Type Only**: No runtime code or utilities
- **ProductId**: Must be updated when new products are added

### Future Improvements

- **Additional Types**: More shared types as needed
- **Type Utilities**: Type utility functions if needed

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- None planned

## 📚 Examples

### Example 1: Type-Safe Product Handling

```typescript
import type { ProductId } from '@kb-labs/core-types';

function getProductConfig(product: ProductId) {
  // TypeScript ensures only valid products
  switch (product) {
    case 'aiReview':
      return aiReviewConfig;
    case 'aiDocs':
      return aiDocsConfig;
    // TypeScript will error if case is missing
  }
}
```

### Example 2: Product Array

```typescript
import type { ProductId } from '@kb-labs/core-types';

const products: ProductId[] = ['aiReview', 'aiDocs', 'devkit'];
```

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs
