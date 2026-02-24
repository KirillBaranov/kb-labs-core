# @kb-labs/core-workspace

> **Core workspace utilities for KB Labs, including root directory resolution and workspace detection.** Provides utilities for locating the KB Labs workspace umbrella directory for internal tooling consumption.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision & Purpose

**@kb-labs/core-workspace** provides workspace utilities for KB Labs internal tooling (CLI, REST, Studio). It resolves the workspace root directory by detecting workspace markers (`.git`, `pnpm-workspace.yaml`, `package.json`) and provides workspace metadata.

## 🏗️ Architecture

### Core Components

#### Workspace Root Resolver

- **Purpose**: Resolve workspace root directory
- **Responsibilities**: Detect workspace markers, return root path
- **Dependencies**: `core-sys` for repository utilities

### Design Patterns

- **Utility Pattern**: Pure utility functions
- **Strategy Pattern**: Multiple detection strategies

### Data Flow

```
resolveWorkspaceRoot({ startDir, stopDir })
    │
    ├──► Walk up directory tree
    ├──► Check for markers (.git, pnpm-workspace.yaml, package.json)
    ├──► Return workspace root
```

## 🚀 Quick Start

### Installation

```bash
pnpm add @kb-labs/core-workspace
```

### Basic Usage

```typescript
import { resolveWorkspaceRoot } from '@kb-labs/core-workspace';

const { root, found } = await resolveWorkspaceRoot({
  startDir: process.cwd()
});

if (found) {
  console.log('Workspace root:', root);
}
```

## ✨ Features

- **Multiple Markers**: Detects workspace via `.git`, `pnpm-workspace.yaml`, `package.json`
- **Flexible Resolution**: Supports start and stop directories
- **Workspace Metadata**: Provides workspace filesystem information

## 🔧 Configuration

### Configuration Options

No configuration needed (utilities only).

### Environment Variables

None.

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

KB Public License v1.1 © KB Labs
