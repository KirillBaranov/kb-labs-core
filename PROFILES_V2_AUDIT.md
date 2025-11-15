# Profiles v2 - Аудит интеграции

## Статус: Частично интегрировано

### ✅ Уже интегрировано

1. **Core Packages:**
   - ✅ `@kb-labs/core-config` - полная поддержка Profiles v2
   - ✅ `@kb-labs/core-bundle` - `loadBundle()` поддерживает `profileId` и `scopeId`
   - ✅ `@kb-labs/core-config/product-config` - интегрирован `ProfileLayerInput`

2. **CLI Commands (частично):**
   - ✅ `bundle/inspect.ts` - обновлен для отображения `bundle.profile.id`, `activeScope`
   - ✅ `bundle/print.ts` - обновлен для отображения новой структуры профиля

3. **Документация:**
   - ✅ ADR-0010 создан
   - ✅ `ADDING_PRODUCT.md` обновлен
   - ✅ `PROFILES_V2_SUMMARY.md` создан

---

## ❌ Требует обновления

### 1. CLI Commands - Profiles Group

#### `packages/cli/src/cli/profiles/inspect.ts`
**Проблема:** Использует старый API (`loadProfile`, `profileKey`, `extractProfileInfo`)

**Текущий код:**
```typescript
const profileKey = (flags['profile-key'] as string) || 'default';
const profiles = (ws?.data as any)?.profiles || {};
const profileRef = profiles[profileKey];
const loaded = await loadProfile({ cwd, name: profileRef });
const info = extractProfileInfo(loaded.profile as any, loaded.meta.pathAbs);
```

**Нужно:**
- Использовать `readProfilesSection()` и `resolveProfile()` из `@kb-labs/core-config`
- Заменить `profileKey` на `profileId`
- Обновить вывод для новой структуры `BundleProfile`

**Приоритет:** Высокий

---

#### `packages/cli/src/cli/profiles/validate.ts`
**Проблема:** Использует старый API (`loadProfile`, `profileKey`)

**Текущий код:**
```typescript
const profileKey = (flags['profile-key'] as string) || 'default';
const profiles = (ws.data as any).profiles || {};
const profileRef = profiles[profileKey];
const loaded = await loadProfile({ cwd, name: profileRef });
const validation = validateProfileApi(loaded.profile as any);
```

**Нужно:**
- Использовать `readProfilesSection()` и `resolveProfile()` из `@kb-labs/core-config`
- Валидировать через Zod схемы `ProfileV2Schema`
- Заменить `profileKey` на `profileId`

**Приоритет:** Высокий

---

#### `packages/cli/src/cli/profiles/resolve.ts`
**Проблема:** Использует старый API (`loadProfile`, `normalizeManifest`, `extractProfileInfo`)

**Текущий код:**
```typescript
const profile = await loadProfile({ 
  cwd,
  name: (flags['profile-key'] as string) || 'default'
});
const manifest = normalizeManifest(profile.profile);
const profileInfo = extractProfileInfo(manifest, profile.meta.pathAbs);
```

**Нужно:**
- Использовать `resolveProfile()` из `@kb-labs/core-config`
- Заменить `profileKey` на `profileId`
- Обновить вывод для новой структуры `BundleProfile` (id, label, source, trace, scopes)

**Приоритет:** Высокий

---

#### `packages/cli/src/manifests/profiles.ts`
**Проблема:** Использует `profile-key` флаг, должен использовать `profile` или `profile-id`

**Текущий код:**
```typescript
flags: [
  { name: 'profile-key', type: 'string', default: 'default' },
  // ...
]
```

**Нужно:**
- Заменить `profile-key` на `profile` или `profile-id`
- Обновить примеры в `examples`

**Приоритет:** Средний

---

### 2. CLI Commands - Bundle Group

#### `packages/cli/src/cli/bundle/inspect.ts`
**Проблема:** Использует `profileKey` вместо `profileId`

**Текущий код:**
```typescript
const profileKey = (flags['profile-key'] as string) || 'default';
const bundle = await loadBundle({ cwd, product, profileKey });
```

**Нужно:**
- Заменить `profileKey` на `profileId` в флагах и вызовах
- Обновить analytics события для использования `profileId`

**Приоритет:** Средний (обратная совместимость через `profileKey` уже есть в `loadBundle`)

---

#### `packages/cli/src/cli/bundle/print.ts`
**Проблема:** Использует `profileKey` вместо `profileId`

**Текущий код:**
```typescript
profileKey: (flags['profile-key'] as string) || 'default',
```

**Нужно:**
- Заменить `profileKey` на `profileId` в флагах
- Обновить analytics события

**Приоритет:** Средний

---

### 3. Тесты

#### `packages/bundle/src/__tests__/bundle.spec.ts`
**Проблема:** Использует старую структуру профилей (`.kb/profiles/<name>/profile.json`)

**Текущий код:**
```typescript
profiles: {
  default: 'node-ts-lib@1.2.0'
}
// Создает .kb/profiles/node-ts-lib/profile.json
expect(bundle.profile.key).toBe('default');
expect(bundle.profile.name).toBe('node-ts-lib');
```

**Нужно:**
- Обновить тесты для использования `profiles[]` в `kb.config.json`
- Использовать `profileId` вместо `profileKey`
- Обновить assertions для новой структуры `BundleProfile`

**Приоритет:** Высокий

---

#### `packages/bundle/__tests__/integration.spec.ts`
**Проблема:** Использует `profileKey` и старую структуру профилей

**Текущий код:**
```typescript
profileKey: 'default'
expect(bundle.profile.key).toBe('default');
expect(bundle.profile.name).toBe('node-ts-lib');
```

**Нужно:**
- Обновить все тесты для использования `profiles[]` в `kb.config.json`
- Заменить `profileKey` на `profileId`
- Обновить assertions

**Приоритет:** Высокий

---

### 4. Типы и интерфейсы

#### `packages/bundle/src/types/types.ts`
**Статус:** Частично обновлено

**Текущий код:**
```typescript
export interface LoadBundleOptions {
  profileId?: string;  // ✅ Новое
  scopeId?: string;    // ✅ Новое
  profileKey?: string; // ⚠️ Старое (для обратной совместимости)
  // ...
}
```

**Нужно:**
- Пометить `profileKey` как `@deprecated`
- Добавить JSDoc с миграционным руководством

**Приоритет:** Низкий (обратная совместимость)

---

#### `packages/config/src/types/types.ts`
**Статус:** Обновлено

**Текущий код:**
```typescript
export interface MergeTrace {
  profileKey?: string;  // ⚠️ Используется в layered-merge
  profileRef?: string;
  // ...
}
```

**Нужно:**
- Обновить `extractProfileKey` и `extractProfileRef` для работы с новым форматом
- Или заменить на `profileId` и `profileSource`

**Приоритет:** Низкий (внутреннее использование)

---

### 5. Документация

#### `docs/BUNDLE_OVERVIEW.md`
**Проблема:** Описывает старую систему профилей

**Нужно:**
- Обновить примеры для Profiles v2
- Добавить ссылку на ADR-0010
- Обновить описание структуры `bundle.profile`

**Приоритет:** Средний

---

#### `docs/CONFIG_API.md`
**Проблема:** Может содержать устаревшие примеры

**Нужно:**
- Проверить и обновить примеры использования профилей
- Добавить примеры для Profiles v2

**Приоритет:** Низкий

---

### 6. Пакет `@kb-labs/core-profiles`

**Статус:** Legacy пакет, используется для обратной совместимости

**Проблема:** 
- Содержит старый API (`loadProfile`, `extractProfileInfo`, etc.)
- Используется в CLI командах и тестах

**Варианты:**
1. **Оставить для обратной совместимости** (рекомендуется)
   - Пометить как `@deprecated`
   - Добавить предупреждения при использовании
   - Постепенно мигрировать код

2. **Удалить полностью**
   - Требует полной миграции всех зависимостей
   - Может сломать существующий код

**Приоритет:** Средний

---

## План миграции

### Фаза 1: CLI Commands (Высокий приоритет)
1. ✅ Обновить `bundle/inspect.ts` и `bundle/print.ts` (частично сделано)
2. ❌ Обновить `profiles/inspect.ts`
3. ❌ Обновить `profiles/validate.ts`
4. ❌ Обновить `profiles/resolve.ts`
5. ❌ Обновить `manifests/profiles.ts`

### Фаза 2: Тесты (Высокий приоритет)
1. ❌ Обновить `bundle.spec.ts`
2. ❌ Обновить `integration.spec.ts`
3. ❌ Добавить тесты для Profiles v2 в CLI

### Фаза 3: Документация (Средний приоритет)
1. ❌ Обновить `BUNDLE_OVERVIEW.md`
2. ❌ Проверить и обновить `CONFIG_API.md`
3. ❌ Добавить примеры миграции

### Фаза 4: Deprecation (Низкий приоритет)
1. ❌ Пометить `profileKey` как deprecated в типах
2. ❌ Добавить предупреждения в `@kb-labs/core-profiles`
3. ❌ Создать migration guide

---

## Рекомендации

1. **Начать с CLI команд** - они наиболее заметны для пользователей
2. **Обновить тесты параллельно** - обеспечит стабильность
3. **Сохранить обратную совместимость** - `profileKey` должен работать, но показывать предупреждение
4. **Документировать изменения** - обновить все примеры и руководства

---

## Метрики

- **Всего файлов для обновления:** ~15
- **Высокий приоритет:** 5 файлов
- **Средний приоритет:** 4 файла
- **Низкий приоритет:** 6 файлов

---

**Последнее обновление:** 2025-01-XX

