# AI-Ready Logging

Система логирования с поддержкой AI-анализа. Автоматически обогащает логи семантическими метаданными, готовыми для машинного обучения и анализа.

## Быстрый старт

### Базовое использование (AI отключен)

```typescript
import { getLogger } from '@kb-labs/core-sys/logging';

const logger = getLogger('my-plugin');
logger.info('Task completed', { taskId: '123' });
// Обычный лог без AI полей - нулевая нагрузка
```

### Включение AI

#### В коде

```typescript
import { configureAI, getLogger } from '@kb-labs/core-sys/logging';

// Включить базовый режим AI
configureAI({ mode: 'basic' });

const logger = getLogger('my-plugin');
logger.info('User created project', { userId: '123', projectId: '456' });
// Лог автоматически обогащается семантическими метаданными
```

#### Через kb.config.json

```json
{
  "logging": {
    "level": "info",
    "ai": {
      "mode": "basic",
      "features": {
        "semanticTags": true,
        "embeddings": {
          "enabled": true,
          "mode": "async"
        },
        "nlp": {
          "enabled": true,
          "extractEntities": true
        },
        "privacy": {
          "autoDetectPII": true,
          "defaultSensitivity": "confidential"
        }
      }
    }
  }
}
```

## Режимы работы

### `off` (по умолчанию)

AI полностью отключен. Нулевая нагрузка, полная обратная совместимость.

```typescript
configureAI({ mode: 'off' });
// или просто не вызывать configureAI
```

### `basic`

Pattern-based обогащение:
- Семантические теги (intent, operation, outcome)
- Извлечение сущностей из meta
- Обнаружение PII через regex
- Подготовка текста для embedding

```typescript
configureAI({ mode: 'basic' });
```

### `full`

Все фичи из `basic` + ML-based возможности (Phase 2):
- ML-based PII detection
- Sentiment analysis
- Advanced entity extraction
- Causality tracking

```typescript
configureAI({ mode: 'full' });
```

## Обогащенные поля

### `semantics`

Семантические метаданные:

```typescript
{
  intent: 'action' | 'state' | 'error' | 'metric' | 'decision',
  domain: string,           // Из category или plugin
  operation: string,        // 'create', 'read', 'update', 'delete', 'execute'
  outcome: 'success' | 'failure' | 'partial' | 'pending',
  causality?: {
    causes?: string[],
    effects?: string[]
  }
}
```

**Пример:**
```typescript
logger.info('User created project', { userId: '123' });
// semantics: {
//   intent: 'action',
//   operation: 'create',
//   outcome: 'success',
//   domain: 'my-plugin'
// }
```

### `nlp`

NLP метаданные:

```typescript
{
  language?: string,
  entities?: Array<{
    type: string,      // 'user', 'project', 'email', etc.
    value: string,
    confidence?: number
  }>,
  sentiment?: 'positive' | 'negative' | 'neutral'
}
```

**Пример:**
```typescript
logger.info('User action', { userId: '123', projectId: '456' });
// nlp: {
//   entities: [
//     { type: 'user', value: '123' },
//     { type: 'project', value: '456' }
//   ]
// }
```

### `embedding`

Подготовка текста для векторизации:

```typescript
{
  embeddingText: string,    // Очищенный, структурированный текст
  embeddingMeta: {
    logType: string,
    severity: number,        // 0-10
    domain: string,
    keywords: string[]
  },
  embeddingVersion?: string
}
```

### `privacy`

Метаданные приватности:

```typescript
{
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted',
  containsPII?: boolean,
  piiTypes?: string[],       // ['email', 'phone', 'ssn']
  aiTraining?: {
    allowed: boolean,
    anonymize?: boolean,
    retention?: string,
    geolocation?: string
  },
  compliance?: string[]      // ['GDPR', 'HIPAA', 'SOC2']
}
```

**Пример:**
```typescript
logger.info('User email is john@example.com');
// privacy: {
//   containsPII: true,
//   piiTypes: ['email'],
//   sensitivity: 'confidential',
//   aiTraining: {
//     allowed: false,
//     anonymize: true
//   }
// }
```

### `relationships`

Связи между логами (Phase 2):

```typescript
{
  parents?: Array<{
    logId: string,
    relationship: 'caused-by' | 'triggered-by' | 'follows' | 'depends-on',
    confidence?: number
  }>,
  children?: Array<{
    logId: string,
    relationship: 'causes' | 'triggers' | 'precedes' | 'enables',
    confidence?: number
  }>,
  group?: {
    groupId: string,
    groupType: string,
    position: number
  }
}
```

## Helper функции

### `logAction`

Упрощенное логирование действий:

```typescript
import { getLogger, logAction } from '@kb-labs/core-sys/logging';

const logger = getLogger('my-plugin');
logAction(logger, 'User created project', {
  userId: '123',
  projectId: '456',
  outcome: 'success'
});
// Автоматически добавляет semantics: { intent: 'action', outcome: 'success' }
```

### `logError`

Упрощенное логирование ошибок:

```typescript
import { getLogger, logError } from '@kb-labs/core-sys/logging';

const logger = getLogger('my-plugin');
try {
  // ...
} catch (error) {
  logError(logger, error, { userId: '123' });
  // Автоматически добавляет semantics: { intent: 'error', outcome: 'failure' }
}
```

### `createPluginLogger`

Создание логгера для плагина с автоматическим контекстом:

```typescript
import { createPluginLogger } from '@kb-labs/core-sys/logging';

const logger = createPluginLogger('my-plugin', '1.0.0');
logger.info('Initialized', { config: '...' });
// Автоматически добавляет plugin: 'my-plugin', pluginVersion: '1.0.0'
```

## Конфигурация фич

### Отключение отдельных фич

```typescript
configureAI({
  mode: 'basic',
  features: {
    semanticTags: true,        // Включить семантические теги
    embeddings: {
      enabled: false,          // Отключить embedding
    },
    nlp: {
      enabled: true,
      extractEntities: true,
      sentiment: false,        // Отключить sentiment analysis
    },
    privacy: {
      autoDetectPII: true,
      defaultSensitivity: 'confidential',
    },
  },
});
```

## Производительность

- **Zero overhead когда AI отключен**: проверка `mode !== 'off'` происходит один раз
- **Синхронное обогащение**: не блокирует основной поток
- **Условное обогащение**: поля добавляются только если включены соответствующие фичи
- **Оптимизированные паттерны**: простые строковые проверки для базовых фич

## Обратная совместимость

✅ **100% обратная совместимость**:
- Все AI поля опциональны
- По умолчанию AI отключен (`mode: 'off'`)
- Существующий код работает без изменений
- Новые поля не влияют на существующие sinks

## Примеры использования

### Плагин с AI логированием

```typescript
import { createPluginLogger, configureAI } from '@kb-labs/core-sys/logging';

// Включить AI для плагина
configureAI({ mode: 'basic' });

const logger = createPluginLogger('payment-processor', '1.0.0');

export async function processPayment(amount: number, userId: string) {
  logger.info('Processing payment', { amount, userId });
  
  try {
    const result = await chargeCard(amount, userId);
    logger.info('Payment successful', { transactionId: result.id });
    // Автоматически обогащается:
    // - semantics: { intent: 'action', operation: 'execute', outcome: 'success' }
    // - nlp: { entities: [{ type: 'user', value: userId }] }
    // - privacy: { sensitivity: 'confidential' } (если обнаружен PII)
    return result;
  } catch (error) {
    logError(logger, error, { userId, amount });
    // Автоматически обогащается:
    // - semantics: { intent: 'error', outcome: 'failure' }
    throw error;
  }
}
```

### Конфигурация через kb.config.json

```json
{
  "logging": {
    "level": "info",
    "mode": "auto",
    "ai": {
      "mode": "basic",
      "features": {
        "semanticTags": true,
        "embeddings": {
          "enabled": true,
          "mode": "async",
          "batchSize": 100
        },
        "nlp": {
          "enabled": true,
          "extractEntities": true,
          "sentiment": false
        },
        "privacy": {
          "autoDetectPII": true,
          "mode": "regex",
          "anonymizeForTraining": true,
          "defaultSensitivity": "confidential"
        },
        "causality": {
          "enabled": false
        }
      }
    },
    "adapters": [
      {
        "type": "console",
        "enabled": true,
        "config": {
          "mode": "tty",
          "format": "human"
        }
      },
      {
        "type": "file",
        "enabled": true,
        "config": {
          "path": "${LOG_PATH}/app.log",
          "maxSize": "10MB",
          "maxAge": "7d"
        }
      }
    ]
  }
}
```

## API Reference

### `configureAI(config: AIConfig)`

Настроить AI логирование.

```typescript
configureAI({
  mode: 'basic',
  features: {
    semanticTags: true,
    embeddings: { enabled: true },
    nlp: { enabled: true },
    privacy: { autoDetectPII: true },
  },
});
```

### `getAIConfig(): AIConfig | undefined`

Получить текущую конфигурацию AI.

### `isAIEnabled(): boolean`

Проверить, включен ли AI.

### `enrichLogRecord(rec: LogRecord): LogRecord`

Обогатить запись лога (используется автоматически, но можно вызвать вручную).

## Phase 2 Features

### Causality Tracking

Отслеживание причинно-следственных связей между логами:

```typescript
import { configureAI, getLogger } from '@kb-labs/core-sys/logging';
import { getLogRelationships, getLogGroup } from '@kb-labs/core-sys/logging';

configureAI({
  mode: 'full',
  features: {
    causality: {
      enabled: true,
      trackRelationships: true,
    },
  },
});

const logger = getLogger('my-plugin');
logger.info('Action started', { executionId: 'exec-123' });
logger.info('Action completed', { executionId: 'exec-123' });

// Получить связи для лога
const relationships = getLogRelationships('log-id');
// Получить группу логов
const group = getLogGroup('exec-123');
```

**Типы связей**:
- `caused-by` - лог вызван другим логом
- `triggered-by` - лог запущен другим логом
- `follows` - лог следует за другим логом
- `depends-on` - лог зависит от другого лога

**Группы логов**:
- `workflow` - группа по executionId
- `transaction` - группа по traceId
- `cascade` - каскадные события
- `session` - события сессии
- `request` - события запроса

### Context Windows

Сохранение предыдущих событий для контекстного анализа:

```typescript
import { enableContextWindow, getPrecedingEvents, getEventsByExecution } from '@kb-labs/core-sys/logging';

// Включить context window
enableContextWindow({
  maxEntries: 100,
  maxSnapshots: 20,
});

// Получить предыдущие события
const preceding = getPrecedingEvents('log-id', 10);
const executionEvents = getEventsByExecution('exec-123');
const traceEvents = getEventsByTrace('trace-123');

// Снимки состояния системы
import { captureSystemStateSnapshot, getSystemStateSnapshot } from '@kb-labs/core-sys/logging';

captureSystemStateSnapshot({
  metrics: {
    memory: 1024,
    cpu: 50,
  },
  contexts: {
    traceId: 'trace-123',
  },
});

const snapshot = getSystemStateSnapshot('2020-01-01T00:00:00.000Z');
```

## Следующие шаги

- **Phase 2.1**: ML-based features (ML-based PII detection, sentiment analysis)
- **Feedback loops**: Механизм обратной связи для улучшения AI
- **Explainability**: Объяснение решений AI

## См. также

- [Основная документация по логированию](./README.md)
- [План улучшений](../docs/logging-enrichment-and-redaction-improvements.md)
- [ADR: Unified Logging System](../../docs/adr/0011-unified-logging-system.md)

