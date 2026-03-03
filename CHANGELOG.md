## [1.2.0] - 2026-03-01

**17 packages** bumped to v1.2.0

| Package | Previous | Bump |
|---------|----------|------|
| `@kb-labs/core` | 1.1.0 | minor |
| `@kb-labs/core-bundle` | 1.0.0 | minor |
| `@kb-labs/core-config` | 1.0.0 | minor |
| `@kb-labs/core-contracts` | 1.0.0 | minor |
| `@kb-labs/core-ipc` | 1.0.0 | minor |
| `@kb-labs/core-policy` | 1.0.0 | minor |
| `@kb-labs/core-platform` | 1.0.0 | minor |
| `@kb-labs/core-resource-broker` | 1.0.0 | minor |
| `@kb-labs/core-runtime` | 1.0.0 | minor |
| `@kb-labs/core-sandbox` | 1.0.0 | minor |
| `@kb-labs/core-state-broker` | 1.0.0 | minor |
| `@kb-labs/core-state-daemon` | 1.0.0 | minor |
| `@kb-labs/core-tenant` | 1.0.0 | minor |
| `@kb-labs/core-sys` | 1.0.0 | minor |
| `@kb-labs/core-workspace` | 1.0.0 | minor |
| `@kb-labs/core-types` | 1.0.0 | minor |
| `@kb-labs/llm-router` | 1.0.0 | minor |

### Features

- **platform**: add LogRetentionPolicy interface and deleteByLevelOlderThan to ILogPersistence
- **hooks**: add git hooks for pre-commit, pre-push, and post-push

### Refactoring

- **runtime**: replace IArtifacts with ISQLDatabase/IDocumentDatabase adapters, add CoreAdapterName type
- **ipc**: remove artifacts adapter, add sqlDatabase/documentDatabase to platform