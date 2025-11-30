# Profiles v2 - Как это работает

## Обзор

Profiles v2 - это новая система профилей, которая позволяет:
- Определять несколько профилей в `kb.config.json`
- Использовать наследование через `extends`
- Настраивать разные конфигурации для разных scopes (например, frontend/backend)
- Загружать профили из npm пакетов

## Структура профиля

```json
{
  "profiles": [
    {
      "id": "base",
      "label": "Base Profile",
      "description": "Описание профиля",
      "extends": "parent-profile-id",  // опционально
      "products": {
        "aiReview": {
          "engine": "openai",
          "maxComments": 20
        }
      },
      "scopes": [
        {
          "id": "root",
          "include": ["**/*"],
          "exclude": ["node_modules/**"],
          "default": true,
          "products": {
            "aiReview": {
              "engine": "anthropic"
            }
          }
        }
      ],
      "meta": {
        "version": "1.0.0",
        "tags": ["production"],
        "deprecated": false
      }
    }
  ]
}
```

## Как это работает

### 1. Чтение профилей

```typescript
import { readProfilesSection } from '@kb-labs/core-config';

const { profiles, sourcePath } = await readProfilesSection(cwd);
// profiles - массив ProfileV2
// sourcePath - путь к kb.config.json или kb-labs.config.yaml
```

### 2. Разрешение профиля

```typescript
import { resolveProfile } from '@kb-labs/core-config';

const bundleProfile = await resolveProfile({
  cwd: '/path/to/workspace',
  profileId: 'frontend'
});

// bundleProfile содержит:
// - id, label, source
// - products (merged с родителем)
// - scopes (resolved)
// - productsByScope (мердж profile + scope)
// - trace (extends chain)
```

**Особенности:**
- Если `extends` указан, профиль мержится с родителем
- `products` мержатся: родитель → текущий профиль
- `scopes` полностью заменяются (не мержатся)
- Поддерживается `extends: '@npm/package#profile-id'` для npm пакетов

### 3. Выбор scope

```typescript
import { selectProfileScope } from '@kb-labs/core-config';

const selection = selectProfileScope({
  bundleProfile,
  cwd: '/path/to/workspace',
  executionPath: '/path/to/file.ts',
  scopeId: 'backend'  // опционально
});

// Алгоритм выбора:
// 1. Если scopeId указан явно → используем его
// 2. Если есть scope с default: true → используем его
// 3. Иначе → no scope (требуется явный --scope)
```

### 4. Использование в loadBundle

```typescript
import { loadBundle } from '@kb-labs/core-bundle';

const bundle = await loadBundle({
  cwd: process.cwd(),
  product: 'aiReview',
  profileId: 'frontend',  // опционально
  scopeId: 'backend'      // опционально
});

// bundle.profile содержит:
// - id, label, source, version
// - activeScopeId, activeScope
// - products (merged)
// - trace (extends chain)
// - productsByScope (для всех scopes)
```

### 5. Product Overlay в конфиге

```typescript
// В getProductConfig() profile overlay добавляется как слой:
// 1. runtime defaults
// 2. profile overlay (bundle.profile.products[product])
// 3. profile-scope overlay (bundle.profile.activeScope.products[product])
// 4. preset
// 5. workspace config
// 6. local config
// 7. CLI overrides
```

## Примеры

### Пример 1: Базовый профиль

```json
{
  "profiles": [
    {
      "id": "default",
      "products": {
        "aiReview": {
          "engine": "openai",
          "maxComments": 20
        }
      },
      "scopes": [
        {
          "id": "root",
          "include": ["**/*"],
          "default": true
        }
      ]
    }
  ]
}
```

### Пример 2: Наследование

```json
{
  "profiles": [
    {
      "id": "base",
      "products": {
        "aiReview": {
          "engine": "openai",
          "maxComments": 20,
          "riskThreshold": "medium"
        }
      }
    },
    {
      "id": "frontend",
      "extends": "base",
      "products": {
        "aiReview": {
          "engine": "anthropic",  // переопределяет base
          "maxComments": 10        // переопределяет base
          // riskThreshold наследуется от base
        }
      }
    }
  ]
}
```

### Пример 3: Per-scope products

```json
{
  "profiles": [
    {
      "id": "multi-scope",
      "products": {
        "aiReview": {
          "engine": "openai",
          "maxComments": 20
        }
      },
      "scopes": [
        {
          "id": "frontend",
          "include": ["src/frontend/**"],
          "default": true,
          "products": {
            "aiReview": {
              "engine": "anthropic",  // переопределяет profile-level
              "maxComments": 5        // переопределяет profile-level
            }
          }
        },
        {
          "id": "backend",
          "include": ["src/backend/**"],
          "products": {
            "aiReview": {
              "engine": "openai",     // использует profile-level
              "maxComments": 15        // переопределяет profile-level
            }
          }
        }
      ]
    }
  ]
}
```

### Пример 4: NPM package profile

```json
{
  "profiles": [
    {
      "id": "workspace",
      "extends": "@kb-labs/preset-node#default",
      "products": {
        "aiReview": {
          "engine": "local"
        }
      }
    }
  ]
}
```

## Тесты

Рабочие тесты находятся в:
- `src/__tests__/profiles-section.spec.ts` - чтение profiles[]
- `src/__tests__/profiles-resolver.spec.ts` - разрешение профилей

Запуск:
```bash
pnpm test profiles-section.spec.ts profiles-resolver.spec.ts
```

## Демонстрация

Запустите демонстрационный скрипт:
```bash
pnpm exec tsx demo-profiles.ts
```

Скрипт показывает:
1. Чтение profiles[] из kb.config.json
2. Разрешение базового профиля
3. Разрешение профиля с extends
4. Выбор scope (default, по пути, explicit)
5. Products by scope (мердж profile + scope)

## Миграция со старой системы

Старая система использовала `.kb/profiles/<name>/profile.json`. Новая система использует `profiles[]` в `kb.config.json`.

**Что изменилось:**
- ❌ `.kb/profiles/<name>/profile.json` → ✅ `profiles[]` в `kb.config.json`
- ❌ `profileKey` → ✅ `profileId`
- ❌ `loadProfile()` → ✅ `resolveProfile()`
- ❌ `profile.defaults.<product>` → ✅ `profile.products.<product>`

**См. также:**
- [ADR-0010](./docs/adr/0010-profiles-v2-architecture.md)
- [ADDING_PRODUCT.md](./docs/ADDING_PRODUCT.md)

