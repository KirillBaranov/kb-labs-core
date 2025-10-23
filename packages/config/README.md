# @kb-labs/core-config

Enhanced configuration system for KB Labs with layered merge, YAML support, and comprehensive tracing.

## Features

- **YAML/JSON Support**: Automatic format detection and parsing
- **Find-up Resolution**: Walks up directory tree to find config files
- **Layered Merge**: Deterministic configuration merging with detailed trace
- **Product Normalization**: Consistent kebab-case (FS) ↔ camelCase (code) mapping
- **LRU Caching**: Filesystem read caching with invalidation
- **Error Handling**: Standardized errors with helpful hints
- **Schema Versioning**: All configs include `schemaVersion: "1.0"`

## API

### Core Functions

```typescript
import { 
  getProductConfig, 
  explainProductConfig, 
  readConfigFile,
  findNearestConfig,
  clearCaches 
} from '@kb-labs/core-config';

// Get product configuration with trace
const result = await getProductConfig({
  cwd: '/path/to/project',
  product: 'aiReview',
  cli: { debug: true }
}, schema);

console.log(result.config); // Merged configuration
console.log(result.trace);   // Detailed merge trace

// Explain configuration without resolving
const explanation = await explainProductConfig({
  cwd: '/path/to/project',
  product: 'aiReview'
}, schema);

// Read config file with format detection
const config = await readConfigFile('kb-labs.config.yaml');

// Find nearest config file
const { path, tried } = await findNearestConfig('/path/to/project');

// Clear caches (useful for tests)
clearCaches();
```

### Product Normalization

```typescript
import { toFsProduct, toConfigProduct, ProductId } from '@kb-labs/core-config';

// Convert to filesystem format
toFsProduct('aiReview'); // 'ai-review'
toFsProduct('aiDocs');   // 'ai-docs'

// Convert to code format
toConfigProduct('ai-review'); // 'aiReview'
toConfigProduct('ai-docs');   // 'aiDocs'
```

### Error Handling

```typescript
import { KbError, getExitCode } from '@kb-labs/core-config';

try {
  const config = await getProductConfig(opts, schema);
} catch (error) {
  if (error instanceof KbError) {
    console.error(error.message);
    console.error('Hint:', error.hint);
    process.exit(getExitCode(error));
  }
}
```

## Configuration Layers

The system merges configuration in this order (later layers override earlier ones):

1. **Runtime defaults** - Built-in defaults for each product
2. **Profile defaults** - From profile manifest defaults
3. **Preset defaults** - From org preset package
4. **Workspace config** - From `kb-labs.config.(json|yaml)`
5. **Local config** - From `.kb/<product>/<product>.config.json`
6. **CLI overrides** - From command line arguments

## Configuration Files

### Workspace Config (`kb-labs.config.yaml`)

```yaml
schemaVersion: "1.0"
profiles:
  default: "node-ts-lib@1.2.0"
  backend: "node-ts-lib@1.2.0"
products:
  ai-review:
    enabled: true
    rules: ["security", "performance"]
  devlink:
    watch: true
    build: true
```

### Local Config (`.kb/ai-review/ai-review.config.json`)

```json
{
  "$schema": "https://schemas.kb-labs.dev/config.schema.json",
  "schemaVersion": "1.0",
  "enabled": true,
  "rules": ["custom-rule"],
  "settings": {
    "debug": true
  }
}
```

## Error Codes

| Code | Exit Code | Description |
|------|-----------|-------------|
| `ERR_CONFIG_NOT_FOUND` | 2 | Config file not found |
| `ERR_CONFIG_INVALID` | 1 | Invalid config syntax |
| `ERR_PRESET_NOT_RESOLVED` | 1 | Preset package not found |
| `ERR_PROFILE_INCOMPATIBLE` | 1 | Profile version incompatible |

## Caching

The system uses LRU caching for filesystem reads:

- **Key**: `absPath|mtime|size`
- **Max Size**: 100 entries
- **Invalidation**: Automatic on file change
- **Clear**: Use `clearCaches()` for tests

## Examples

### Basic Usage

```typescript
import { getProductConfig } from '@kb-labs/core-config';

const config = await getProductConfig({
  cwd: process.cwd(),
  product: 'aiReview',
  cli: { debug: true }
}, aiReviewSchema);

console.log('AI Review config:', config.config);
console.log('Merge trace:', config.trace);
```

### CLI Integration

```typescript
import { getProductConfig, KbError, getExitCode } from '@kb-labs/core-config';

try {
  const result = await getProductConfig({
    cwd: process.cwd(),
    product: 'aiReview',
    cli: cliArgs
  }, schema);
  
  console.log(JSON.stringify(result.config, null, 2));
} catch (error) {
  if (error instanceof KbError) {
    console.error(`Error: ${error.message}`);
    if (error.hint) {
      console.error(`Hint: ${error.hint}`);
    }
    process.exit(getExitCode(error));
  }
  throw error;
}
```

### Testing

```typescript
import { clearCaches } from '@kb-labs/core-config';

beforeEach(() => {
  clearCaches(); // Clear caches between tests
});
```
