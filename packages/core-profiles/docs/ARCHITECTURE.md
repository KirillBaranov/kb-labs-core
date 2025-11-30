# Package Architecture Description: @kb-labs/core-profiles

**Version**: 0.1.0
**Last Updated**: 2025-11-16

## Executive Summary

**@kb-labs/core-profiles** implements Profiles v2 system for KB Labs with artifact management, profile composition via `extends`, and comprehensive security constraints. The package provides reusable configuration profiles that can be shared via npm packages, with artifacts (files) that can be materialized into workspaces.

## 1. Package Overview

### 1.1 Purpose & Scope

**Primary Purpose**: Provide Profiles v2 system with artifact management and security constraints.

**Scope Boundaries**:
- **In Scope**: Profile loading, artifact management, extends resolution, security constraints
- **Out of Scope**: Profile creation UI, profile publishing (separate tooling)

**Domain**: Core Infrastructure / Profile Management

### 1.2 Key Responsibilities

1. **Profile Loading**: Load profiles from npm or local filesystem
2. **Artifact Management**: List, read, and materialize artifacts
3. **Extends Resolution**: Resolve profile composition with cycle detection
4. **Security Enforcement**: Whitelist, size limits, SHA256 verification

## 2. High-Level Architecture

### 2.1 Architecture Diagram

```
Profile System
    │
    ├──► Profile Loading (npm/local)
    ├──► Schema Validation (AJV)
    ├──► Extends Resolution (cycle detection)
    ├──► Artifact Discovery (glob patterns)
    ├──► Security Validation (whitelist, size)
    └──► Materialization (SHA-based skip)
```

### 2.2 Architectural Style

- **Style**: Factory Pattern with Security Layer
- **Rationale**: Profiles are created from manifests, artifacts have security constraints

## 3. Component Architecture

### 3.1 Component: Profile Loading

- **Purpose**: Load and validate profile manifests
- **Responsibilities**: Parse JSON/YAML, validate schema, resolve location
- **Dependencies**: `core-config`, `ajv`, `yaml`

### 3.2 Component: Artifact Management

- **Purpose**: Manage profile artifacts (files)
- **Responsibilities**: List artifacts, read content, materialize to filesystem
- **Dependencies**: `glob`, `picomatch`

### 3.3 Component: Security Constraints

- **Purpose**: Enforce security for artifacts
- **Responsibilities**: Whitelist validation, size limits, SHA256 verification
- **Dependencies**: None

### 3.4 Component: Extends Resolution

- **Purpose**: Resolve profile composition
- **Responsibilities**: Load extended profiles, detect cycles, merge exports
- **Dependencies**: Profile loading

## 4. Data Flow

```
loadProfile({ name, cwd })
    │
    ├──► Resolve location (npm/local)
    ├──► Load manifest file
    ├──► Validate schema
    ├──► Resolve extends (cycle detection)
    ├──► Extract profile info
    └──► return ProfileInfo
```

## 5. Design Patterns

- **Factory Pattern**: Profile creation from manifests
- **Strategy Pattern**: Different artifact loading strategies
- **Cache Pattern**: LRU cache for artifact metadata

## 6. Security Architecture

### 6.1 Security Model

- **Security Boundaries**: Profile root directory
- **Threat Model**: Path traversal, malicious files, size attacks

### 6.2 Security Mechanisms

- **File Whitelist**: Only allowed extensions
- **Path Validation**: No `..` escapes
- **Size Limits**: 1MB per file, 100 files per key
- **SHA256 Verification**: Artifact integrity

---

**Last Updated**: 2025-11-16

