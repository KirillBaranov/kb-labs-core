# KB Labs Core Documentation Standard

> **This document is a project-specific copy of the KB Labs Documentation Standard.**  
> See [Main Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md) for the complete ecosystem standard.

This document defines the documentation standards for **KB Labs Core**. This project follows the [KB Labs Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md) with the following project-specific customizations:

## Project-Specific Customizations

KB Labs Core is the runtime core with profiles resolver/validator and infrastructure abstractions. Documentation should focus on:

- Configuration system (6-layer architecture)
- Profile system and artifacts
- Bundle API and usage
- Migration from legacy systems
- API reference for all core packages

## Project Documentation Structure

```
docs/
├── DOCUMENTATION.md       # This standard (REQUIRED)
├── BUNDLE_OVERVIEW.md     # Bundle system overview
├── CONFIG_API.md          # Configuration API reference
├── CLI_README.md          # CLI commands documentation
├── ADDING_PRODUCT.md      # Guide for adding new products
├── MIGRATION_GUIDE.md     # Migration guide from legacy
└── adr/                   # Architecture Decision Records
    ├── 0000-template.md  # ADR template
    └── *.md               # ADR files
```

## Required Documentation

This project requires:

- [x] `README.md` in root with all required sections
- [x] `CONTRIBUTING.md` in root with development guidelines
- [x] `docs/DOCUMENTATION.md` (this file)
- [ ] `docs/adr/0000-template.md` (ADR template - should be created from main standard)
- [x] `LICENSE` in root

## Optional Documentation

Consider adding:

- [ ] `docs/glossary.md` - Core-specific terms (Profiles, Bundles, etc.)
- [ ] `docs/examples.md` - Configuration examples
- [ ] `docs/faq.md` - Frequently asked questions

## ADR Requirements

All ADRs must follow the format defined in the [main standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md#architecture-decision-records-adr) with:

- Required metadata: Date, Status, Deciders, Last Reviewed, Tags
- Minimum 1 tag, maximum 5 tags
- Tags from approved list
- See main standard `docs/templates/ADR.template.md` for template

## Cross-Linking

This project links to:

**Dependencies:**
- [@kb-labs/shared](https://github.com/KirillBaranov/kb-labs-shared) - Shared types

**Used By:**
- [@kb-labs/cli](https://github.com/KirillBaranov/kb-labs-cli) - CLI wrapper
- [@kb-labs/rest-api](https://github.com/KirillBaranov/kb-labs-rest-api) - REST API layer
- [@kb-labs/ai-review](https://github.com/KirillBaranov/kb-labs-ai-review) - AI Review
- All other KB Labs products

**Ecosystem:**
- [KB Labs](https://github.com/KirillBaranov/kb-labs) - Main ecosystem repository

---

**Last Updated:** 2025-11-03  
**Standard Version:** 1.0 (following KB Labs ecosystem standard)  
**See Main Standard:** [KB Labs Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md)


