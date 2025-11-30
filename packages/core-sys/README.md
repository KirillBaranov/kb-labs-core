# @kb-labs/core-sys

> **Core system utilities for KB Labs, including structured logging, file system operations, and repository utilities.** Provides foundational system-level functionality used across all KB Labs packages.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision & Purpose

**@kb-labs/core-sys** provides core system utilities for KB Labs packages. It includes structured logging with multiple sinks, file system operations, repository utilities, and type definitions. This package is the foundation for system-level operations across the KB Labs ecosystem.

### What Problem Does This Solve?

- **Logging Consistency**: Packages need consistent structured logging - sys provides unified logging system
- **File System Operations**: Packages need file system utilities - sys provides path resolution and file operations
- **Repository Detection**: Packages need to find repository roots - sys provides repository utilities
- **Type Definitions**: Packages need shared types - sys provides common type definitions

### Why Does This Package Exist?

- **Unified System Utilities**: All KB Labs packages use the same system utilities
- **Structured Logging**: Centralized logging with multiple sinks (stdout, JSON)
- **Code Reuse**: Avoid duplicating system utilities across packages
- **Consistency**: Ensure consistent behavior across packages

### What Makes This Package Unique?

- **Structured Logging**: Multiple sinks (stdout, JSON) with redaction support
- **Environment Configuration**: Logging configuration from environment variables
- **Repository Utilities**: Git repository root detection
- **Path Utilities**: Absolute path resolution

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
- **Documentation Coverage**: 70% (target: 100%)
- **API Stability**: Stable
- **Breaking Changes**: None in last 6 months
- **Last Major Version**: 0.1.0
- **Next Major Version**: 1.0.0

### Production Readiness

- [x] **API Stability**: API is stable
- [x] **Error Handling**: Comprehensive error handling
- [x] **Logging**: Structured logging implemented
- [x] **Testing**: Unit tests present
- [x] **Performance**: Efficient operations
- [x] **Security**: Path validation, redaction support
- [x] **Documentation**: API documentation
- [x] **Migration Guide**: N/A (no breaking changes)

## 🏗️ Architecture

### High-Level Architecture

The sys package provides system utilities:

```
System Utilities
    │
    ├──► Logging (structured, multiple sinks)
    ├──► File System (path resolution, file operations)
    ├──► Repository (Git root detection)
    └──► Types (shared type definitions)
```

### Core Components

#### Logging System

- **Purpose**: Structured logging with multiple sinks
- **Responsibilities**: Log formatting, sink management, level filtering, redaction
- **Dependencies**: None (pure TypeScript)

#### File System Utilities

- **Purpose**: File system operations and path resolution
- **Responsibilities**: Absolute path resolution, file operations
- **Dependencies**: `node:fs`, `node:path`

#### Repository Utilities

- **Purpose**: Git repository operations
- **Responsibilities**: Repository root detection
- **Dependencies**: `node:fs`, `node:path`

### Design Patterns

- **Sink Pattern**: Multiple logging sinks (stdout, JSON)
- **Factory Pattern**: Logger creation
- **Strategy Pattern**: Different logging strategies

### Data Flow

```
getLogger(category)
    │
    ├──► Create logger instance
    ├──► Configure from environment
    ├──► Add sinks
    └──► return Logger

log.info(message, context)
    │
    ├──► Check log level
    ├──► Format message
    ├──► Redact sensitive data
    ├──► Send to sinks
    └──► return void
```

## 🚀 Quick Start

### Installation

```bash
pnpm add @kb-labs/core-sys
```

### Basic Usage

```typescript
import { getLogger } from '@kb-labs/core-sys/logging';
import { toAbsolute } from '@kb-labs/core-sys/fs';
import { findRepoRoot } from '@kb-labs/core-sys/repo';

// Logging
const log = getLogger('my-package');
log.info('Hello world', { userId: 123 });

// File System
const absPath = toAbsolute('/base', './relative');

// Repository
const repoRoot = await findRepoRoot();
```

## ✨ Features

### Logging

- **Structured Logging**: JSON-formatted logs with context
- **Multiple Sinks**: stdout, JSON file, custom sinks
- **Log Levels**: debug, info, warn, error
- **Redaction**: Automatic redaction of sensitive data
- **Environment Configuration**: Configure via environment variables

### File System

- **Path Resolution**: Convert relative to absolute paths
- **File Operations**: File system utilities

### Repository

- **Repository Detection**: Find Git repository root

## 📦 API Reference

### Logging

#### `getLogger(category?: string): Logger`

Creates a logger instance for a category.

**Parameters:**
- `category` (`string?`): Logger category name

**Returns:**
- `Logger`: Logger instance

#### `configureLogger(opts: ConfigureOpts): void`

Configures global logger settings.

**Parameters:**
- `opts.level` (`LogLevel?`): Global log level
- `opts.sinks` (`LogSink[]?`): Log sinks

#### `addSink(sink: LogSink): void`

Adds a log sink.

#### `setLogLevel(level: LogLevel): void`

Sets global log level.

### File System

#### `toAbsolute(baseDir: string, maybeRelative?: string): string`

Converts relative path to absolute path.

**Parameters:**
- `baseDir`: Base directory
- `maybeRelative`: Relative path (optional)

**Returns:**
- `string`: Absolute path

### Repository

#### `findRepoRoot(startDir?: string): Promise<string>`

Finds Git repository root directory.

**Parameters:**
- `startDir`: Starting directory (default: `process.cwd()`)

**Returns:**
- `Promise<string>`: Repository root path

## 🔧 Configuration

### Logging Configuration

Configure logging via environment variables:

- `KB_LOG_LEVEL`: Log level (debug, info, warn, error)
- `KB_LOG_SINK`: Sink type (stdout, json)
- `KB_LOG_REDACT_KEYS`: Comma-separated keys to redact

### Environment Variables

- `KB_LOG_LEVEL`: Logging level
- `KB_LOG_SINK`: Log sink type
- `KB_LOG_REDACT_KEYS`: Keys to redact

## 🔗 Dependencies

### Runtime Dependencies

- `ajv` (`^8.17.1`): JSON schema validation
- `ajv-formats` (`^3.0.1`): Additional formats
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
├── logging/
│   ├── logger.spec.ts
│   ├── redaction.spec.ts
│   └── sinks-and-env.spec.ts
├── fs/
│   └── fs.spec.ts
└── repo/
    └── repo.spec.ts
```

### Test Coverage

- **Current Coverage**: ~85%
- **Target Coverage**: 90%

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(1) for most operations
- **Space Complexity**: O(1) (minimal state)
- **Bottlenecks**: File I/O for repository detection

## 🔒 Security

### Security Considerations

- **Path Validation**: Path resolution prevents traversal
- **Redaction**: Sensitive data redaction in logs
- **Input Validation**: All inputs validated

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Repository Detection**: Only supports Git repositories
- **Log Sinks**: Limited sink types (stdout, JSON)

### Future Improvements

- **Additional Sinks**: File sink, remote sink
- **Repository Types**: Support for other VCS

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- None planned

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs

