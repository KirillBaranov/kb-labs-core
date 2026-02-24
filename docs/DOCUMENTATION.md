# KB Labs Core Documentation Standard

> **This document is a project-specific copy of the KB Labs Documentation Standard.**  
> See [Main Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md) for the complete ecosystem standard.

This document defines the documentation standards for **KB Labs Core**. This project follows the [KB Labs Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md) with the following project-specific customizations:

## Project-Specific Customizations

KB Labs Core is the runtime foundation providing profiles, configuration, platform abstractions, IPC, LLM routing, and shared infrastructure. Documentation should focus on:

- 6-layer configuration system and profile resolution
- Platform adapter architecture and IPC protocol
- LLM router and adapter binding
- Multi-tenancy and rate limiting primitives
- Bundle API and package integration patterns

## Project Documentation Structure

```
docs/
├── DOCUMENTATION.md           # This standard (REQUIRED)
├── ADAPTER_MANIFEST_GUIDE.md  # Adapter manifest authoring guide
├── ADDING_PRODUCT.md          # Guide for adding new products
├── BUNDLE_OVERVIEW.md         # Bundle system architecture
├── CLI_README.md              # CLI commands documentation
├── CONFIG_API.md              # Configuration API reference
├── PLATFORM_QUICK_REF.md      # Platform facade quick reference
└── adr/                       # Architecture Decision Records
    ├── 0000-template.md
    └── *.md
```

## Required Documentation

This project requires:

- [x] `README.md` in root with all required sections
- [x] `CONTRIBUTING.md` in root with development guidelines
- [x] `docs/DOCUMENTATION.md` (this file)
- [x] `LICENSE` in root

## ADR Requirements

All ADRs must follow the format defined in the [main standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md#architecture-decision-records-adr) with:

- Required metadata: Date, Status, Deciders, Last Reviewed, Tags
- Minimum 1 tag, maximum 5 tags
- Tags from approved list

## Cross-Linking

This project links to:

**Dependencies:**
- [@kb-labs/shared](https://github.com/KirillBaranov/kb-labs-shared) — Shared utilities and types
- [@kb-labs/plugin](https://github.com/KirillBaranov/kb-labs-plugin) — Plugin execution infrastructure

**Used By:**
- [@kb-labs/cli](https://github.com/KirillBaranov/kb-labs-cli) — CLI layer
- [@kb-labs/rest-api](https://github.com/KirillBaranov/kb-labs-rest-api) — REST API layer
- All other KB Labs products

**Ecosystem:**
- [KB Labs](https://github.com/KirillBaranov/kb-labs) — Main ecosystem repository

---

**Last Updated:** 2026-02-24  
**Standard Version:** 1.0 (following KB Labs ecosystem standard)  
**See Main Standard:** [KB Labs Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md)
