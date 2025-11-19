# @kb-labs/core-cli

> **CLI commands for KB Labs core configuration system.** Provides command-line interface for configuration, profiles, bundles, and workspace initialization.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision & Purpose

**@kb-labs/core-cli** provides CLI commands for KB Labs core configuration system. It includes commands for configuration management, profile operations, bundle inspection, and workspace initialization. These commands are integrated into the main KB Labs CLI via plugin manifest system.

### What Problem Does This Solve?

- **CLI Commands**: Core system needs CLI commands for configuration, profiles, bundles - core-cli provides these commands
- **Workspace Management**: Developers need to initialize and manage workspaces - core-cli provides init commands
- **Configuration Debugging**: Developers need to debug configuration issues - core-cli provides explain/doctor commands
- **Profile Operations**: Developers need to inspect and validate profiles - core-cli provides profile commands

### Why Does This Package Exist?

- **Unified CLI**: All core system commands in one package
- **Plugin Integration**: Commands integrated via plugin manifest system
- **Developer Experience**: Easy-to-use CLI commands for common operations
- **Debugging Tools**: Commands for diagnosing configuration issues

### What Makes This Package Unique?

- **Plugin Manifest**: Commands registered via manifest.v2.ts
- **Command Categories**: Organized by domain (config, profiles, bundle, init)
- **Suggestions**: Auto-suggestions for commands and flags
- **Analytics**: Command usage analytics integration

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
- **Documentation Coverage**: 70% (target: 100%)
- **API Stability**: Stable
- **Breaking Changes**: None in last 6 months
- **Last Major Version**: 0.1.0
- **Next Major Version**: 1.0.0

### Production Readiness

- [x] **API Stability**: API is stable
- [x] **Error Handling**: Comprehensive error handling
- [x] **Logging**: Structured logging via core-sys
- [x] **Testing**: Unit tests present
- [x] **Performance**: Efficient command execution
- [x] **Security**: Input validation
- [x] **Documentation**: API documentation
- [x] **Migration Guide**: N/A (no breaking changes)

## 🏗️ Architecture

### High-Level Architecture

The CLI package provides commands organized by domain:

```
CLI Commands
    │
    ├──► Config Commands (explain, doctor, validate, get, inspect)
    ├──► Profile Commands (inspect, resolve, validate)
    ├──► Bundle Commands (inspect, print)
    └──► Init Commands (workspace, setup, policy)
```

### Core Components

#### Command Modules

- **Purpose**: Implement CLI commands
- **Responsibilities**: Parse arguments, execute logic, format output
- **Dependencies**: `cli-core`, `core-bundle`, `core-config`, `core-profiles`

#### Manifest System

- **Purpose**: Register commands with CLI framework
- **Responsibilities**: Define command metadata, flags, descriptions
- **Dependencies**: `plugin-manifest`

#### Suggestions System

- **Purpose**: Provide auto-suggestions for commands
- **Responsibilities**: Generate suggestions based on context
- **Dependencies**: `shared-cli-ui`

### Design Patterns

- **Command Pattern**: Each command is a module
- **Plugin Pattern**: Commands registered via manifest
- **Strategy Pattern**: Different output formats

### Data Flow

```
CLI Framework
    │
    ├──► Load manifest.v2.ts
    ├──► Register commands
    ├──► Parse arguments
    ├──► Execute command module
    ├──► Format output
    └──► Return result
```

## 🚀 Quick Start

### Installation

```bash
pnpm add @kb-labs/core-cli
```

### Basic Usage

Commands are available via main KB Labs CLI:

```bash
# Configuration commands
kb config explain --product aiReview
kb config doctor
kb config validate

# Profile commands
kb profiles inspect --profile default
kb profiles resolve --profile default

# Bundle commands
kb bundle inspect --product aiReview
kb bundle print --product aiReview

# Init commands
kb init workspace
kb init setup
kb init policy
```

## ✨ Features

### Command Categories

#### Config Commands

- **explain**: Explain configuration resolution with trace
- **doctor**: Diagnose configuration issues
- **validate**: Validate configuration against schema
- **get**: Get configuration value
- **inspect**: Inspect configuration layers

#### Profile Commands

- **inspect**: Inspect profile manifest
- **resolve**: Resolve profile with extends
- **validate**: Validate profile schema

#### Bundle Commands

- **inspect**: Inspect bundle configuration
- **print**: Print bundle configuration

#### Init Commands

- **workspace**: Initialize workspace
- **setup**: Setup workspace configuration
- **policy**: Initialize policy

### Features

- **Plugin Manifest**: Commands registered via manifest.v2.ts
- **Auto-suggestions**: Command and flag suggestions
- **Analytics**: Usage analytics integration
- **Error Handling**: Comprehensive error messages

## 📦 API Reference

### Main Exports

#### Command Modules

Each command is exported as a module:

```typescript
// Config commands
export * from './cli/config/explain';
export * from './cli/config/doctor';
export * from './cli/config/validate';
export * from './cli/config/get';
export * from './cli/config/inspect';

// Profile commands
export * from './cli/profiles/inspect';
export * from './cli/profiles/resolve';
export * from './cli/profiles/validate';

// Bundle commands
export * from './cli/bundle/inspect';
export * from './cli/bundle/print';

// Init commands
export * from './cli/init/workspace';
export * from './cli/init/setup';
export * from './cli/init/policy';
```

#### Manifest

```typescript
// manifest.v2.ts
export const manifest = {
  commands: [...],
  suggestions: createCoreCLISuggestions()
};
```

### Types & Interfaces

#### CommandModule

```typescript
interface CommandModule {
  handler: (args: CommandArgs) => Promise<void>;
  manifest: CommandManifest;
}
```

#### CommandManifest

```typescript
interface CommandManifest {
  name: string;
  description: string;
  flags: FlagDefinition[];
  examples?: string[];
}
```

## 🔧 Configuration

### Configuration Options

Commands use workspace configuration from `kb-labs.config.*` and product-specific configs.

### Environment Variables

- `KB_LOG_LEVEL`: Logging level for commands
- `KB_ANALYTICS_ENABLED`: Enable/disable analytics

## 🔗 Dependencies

### Runtime Dependencies

- `@kb-labs/cli-core` (`link:`): CLI framework
- `@kb-labs/core-bundle` (`link:`): Bundle system
- `@kb-labs/core-config` (`link:`): Configuration system
- `@kb-labs/core-profiles` (`link:`): Profile system
- `@kb-labs/core-policy` (`link:`): Policy system
- `@kb-labs/plugin-manifest` (`link:`): Plugin manifest system
- `@kb-labs/shared-cli-ui` (`link:`): CLI UI utilities
- `glob` (`^11.0.3`): File pattern matching
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
├── [command test files]
```

### Test Coverage

- **Current Coverage**: ~80%
- **Target Coverage**: 90%

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(n) where n = command complexity
- **Space Complexity**: O(1) (minimal state)
- **Bottlenecks**: File I/O for config/profile loading

## 🔒 Security

### Security Considerations

- **Input Validation**: All inputs validated
- **Path Traversal**: Path validation prevents traversal
- **Command Execution**: Commands execute in safe context

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Command Discovery**: Commands must be registered in manifest
- **Output Format**: Limited output format options

### Future Improvements

- **Additional Commands**: More diagnostic commands
- **Output Formats**: Support for JSON, YAML output

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- None planned

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs

