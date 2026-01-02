# Logging Features Extraction: Worth Preserving for Future

**Date:** 2026-01-01
**Source:** `@kb-labs/core-sys/logging` (pre-cleanup)
**Target:** Future ILogger adapter implementation (Pino or custom)

---

## 🎯 Executive Summary

The `core-sys/logging` system contains valuable AI-ready and observability features that are **currently unused** in production but worth preserving for future integration into the ILogger adapter system.

**Key Finding:**
- ❌ Features are **NOT activated** (no calls to `configureAI()`, `enableContextWindow()`, etc.)
- ✅ Implementation is **solid and well-designed**
- ⭐ **Worth extracting** into standalone library for future use

---

## 📦 Features Worth Preserving

### 1. **Context Window Management** ⭐⭐⭐
**File:** `context-window.ts` (273 lines)
**Status:** Implemented but unused
**Value:** HIGH

**What it does:**
- Maintains sliding window of recent log entries (default: 50 entries)
- Captures system state snapshots for debugging
- Correlates logs by execution context, trace ID, time window
- Provides "preceding events" for error analysis

**Key APIs:**
```typescript
enableContextWindow({ maxEntries: 50, maxSnapshots: 10 });
addToContextWindow(logRecord);
getPrecedingEvents(logId, count); // Get N events before this log
getPrecedingEventsByTime(timestamp, 5000); // Get events in 5s window
getEventsByExecution(executionId); // All logs for one execution
getEventsByTrace(traceId); // Distributed tracing correlation
captureSystemStateSnapshot({ memory, cpu, activeConnections });
```

**Use Cases:**
1. **AI Log Analysis** - Provide context to LLM for error diagnosis
2. **Debugging** - "What happened before this error?"
3. **Root Cause Analysis** - Trace execution flow leading to failure
4. **Performance Analysis** - Correlate slow operations with system state

**Integration Strategy:**
- Extract into `@kb-labs/logging-context-window` package
- Make it ILogger-agnostic (accepts generic log records)
- Add to Pino adapter via plugin/wrapper

---

### 2. **AI Enrichment** ⭐⭐⭐
**File:** `ai-enrichment.ts` (373 lines)
**Status:** Implemented but unused
**Value:** HIGH

**What it does:**
- **Semantic inference** - Detects intent (action/state/error/metric/decision)
- **Entity extraction** - Finds IDs, names, emails, users, projects from metadata
- **PII detection** - Identifies emails, phones, credit cards, SSNs, API keys
- **Embedding preparation** - Creates searchable text for vector embeddings
- **Keyword extraction** - Extracts important terms from log messages

**Key Features:**

#### A. Semantic Intent Detection
```typescript
inferSemanticIntent("User created successfully", "info")
// Returns: { intent: 'action', operation: 'create', outcome: 'success' }

inferSemanticIntent("Database connection failed", "error")
// Returns: { intent: 'error', operation: undefined, outcome: 'failure' }
```

**Patterns detected:**
- **Actions:** created, deleted, updated, executed, started, completed
- **State:** initialized, ready, connected, disconnected
- **Metrics:** took Xms, duration, seconds
- **Decisions:** decided, chose, selected

#### B. Entity Extraction
```typescript
extractEntitiesFromMeta({ userId: '123', projectName: 'kb-labs', userEmail: 'user@example.com' })
// Returns: [
//   { type: 'user', value: '123' },
//   { type: 'project', value: 'kb-labs' },
//   { type: 'email', value: 'user@example.com' }
// ]
```

#### C. PII Detection (Privacy-First)
```typescript
detectPII("User email: user@example.com, API key: sk-1234567890abcdef")
// Returns: { containsPII: true, piiTypes: ['email', 'apiKey'] }
```

**Patterns detected:**
- Emails (regex)
- Phone numbers (international format)
- Credit cards (4-4-4-4 pattern)
- SSN (US format)
- API keys (Bearer tokens, JWT, sk-*, pk-*, long alphanumeric)
- Sensitive meta keys (password, secret, token, api_key, etc.)

**Value Proposition:**
- **AI Training Safety** - Don't send PII to LLMs
- **GDPR Compliance** - Automatic PII detection
- **Log Search** - Vector embeddings for semantic search
- **Anomaly Detection** - ML models can learn from semantic intent

**Integration Strategy:**
- Extract into `@kb-labs/logging-ai-enrichment` package
- Run as middleware before sending logs to backend
- Add `enrichment: { semantics, entities, privacy }` field to log records

---

### 3. **Causality Tracking** ⭐⭐
**File:** `causality-tracker.ts` (371 lines)
**Status:** Implemented but unused
**Value:** MEDIUM-HIGH

**What it does:**
- Builds **event graph** - detects relationships between logs
- Groups related logs into transactions/workflows/cascades
- Tracks execution context lineage

**Relationship Types:**
1. **`caused-by`** - Error caused by previous action (confidence: 0.7-0.9)
2. **`triggered-by`** - One event triggered another
3. **`follows`** - Sequential relationship (confidence: 0.5-0.8)
4. **`depends-on`** - Dependency relationship
5. **`precedes`** - Temporal ordering

**Detection Methods:**
- **Execution context** - Same `executionId` → 0.8 confidence
- **Trace/Span hierarchy** - Parent-child spans → 0.9 confidence
- **Semantic proximity** - Same domain + intent + time window (5s) → 0.6 confidence
- **Error cascades** - Action → Error in same domain (10s window) → 0.7 confidence

**Log Grouping:**
```typescript
// Automatically creates groups
{
  groupId: 'exec-abc123',
  groupType: 'workflow', // or 'transaction', 'cascade', 'session', 'request'
  logIds: ['log1', 'log2', 'log3'],
  startTime: '2026-01-01T12:00:00Z',
  endTime: '2026-01-01T12:00:05Z',
  metadata: { executionId: 'abc123', plugin: 'mind', command: 'rag-query' }
}
```

**Use Cases:**
1. **Distributed Tracing Visualization** - Build execution flow graphs
2. **Error Diagnosis** - "What actions led to this error?"
3. **Performance Analysis** - Identify slow cascades
4. **Workflow Analytics** - Measure end-to-end execution patterns

**Integration Strategy:**
- Extract into `@kb-labs/logging-causality` package
- Store relationships in analytics backend (Clickhouse, Elasticsearch)
- Expose GraphQL API for relationship queries
- Build UI for causality graph visualization

---

### 4. **Redaction System** ⭐
**File:** `redaction.ts` (referenced but not read yet)
**Status:** Unknown
**Value:** MEDIUM

**Expected Features:**
- Automatic masking of sensitive fields
- Configurable redaction patterns
- Safe logging of API keys, tokens, passwords

**Integration Strategy:**
- Check implementation quality
- Extract if well-designed
- Add to Pino adapter as middleware

---

## 🚫 Features NOT Worth Preserving

### 1. **Custom Sinks System**
**Files:** `sinks/console-sink.ts`, `sinks/file-sink.ts`, `sinks/json-sink.ts`, etc.

**Why:** Pino already has excellent transports system
- Pino has `pino-pretty`, `pino/file`, `pino-elasticsearch`, etc.
- Custom sinks add complexity without benefit

**Recommendation:** Delete after extracting enrichment logic

---

### 2. **Metrics & Health Checks**
**Files:** `metrics.ts`, `health.ts`

**Why:** Should live in dedicated observability package
- Metrics belong in `@kb-labs/analytics` or Prometheus
- Health checks belong in API-level middleware

**Recommendation:** Move to appropriate package or delete

---

### 3. **Adapter System (Sentry, Datadog, Loki, Elasticsearch)**
**Files:** `adapters/sentry-adapter.ts`, `adapters/datadog-adapter.ts`, etc.

**Why:** Pino already has transports for all major backends
- `pino-sentry`, `pino-datadog`, `pino-loki` exist
- Our custom adapters add maintenance burden

**Recommendation:** Delete, use Pino ecosystem

---

### 4. **AI Config System**
**Files:** `ai-config.ts`, `ai-enrichment.ts` (config part)

**Why:** Configuration should be in `kb.config.json`, not code
- Current system has unused `mode: 'off' | 'basic' | 'full'`
- No actual usage in codebase

**Recommendation:** Simplify to simple feature flags in config

---

## 📋 Extraction Plan

### Phase 1: Create Standalone Packages

**1.1 Context Window**
```bash
# New package: @kb-labs/logging-context-window
packages/
  logging-context-window/
    src/
      index.ts          # Main API
      storage.ts        # In-memory storage
      queries.ts        # Query functions
    README.md
    package.json
```

**API Design:**
```typescript
import { ContextWindowManager } from '@kb-labs/logging-context-window';

const manager = new ContextWindowManager({
  maxEntries: 100,
  maxSnapshots: 20,
});

// Add logs (ILogger-agnostic)
manager.add({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'User created',
  metadata: { userId: '123', executionId: 'exec-abc' },
});

// Query
const preceding = manager.getPrecedingEvents({ logId: 'log-456', count: 10 });
const byExecution = manager.getEventsByExecution('exec-abc');
```

**1.2 AI Enrichment**
```bash
# New package: @kb-labs/logging-ai-enrichment
packages/
  logging-ai-enrichment/
    src/
      index.ts              # Main API
      semantic-intent.ts    # Semantic inference
      entity-extraction.ts  # Entity extraction
      pii-detection.ts      # PII detection
      embedding-prep.ts     # Embedding text preparation
      keywords.ts           # Keyword extraction
    README.md
    package.json
```

**API Design:**
```typescript
import { enrichLogRecord } from '@kb-labs/logging-ai-enrichment';

const enriched = enrichLogRecord({
  message: 'User user@example.com created project kb-labs',
  metadata: { userId: '123', apiKey: 'sk-abc123' },
  level: 'info',
});

// Result:
{
  ...originalLog,
  enrichment: {
    semantics: { intent: 'action', operation: 'create', outcome: 'success' },
    entities: [{ type: 'email', value: 'user@example.com' }, { type: 'user', value: '123' }],
    privacy: { containsPII: true, piiTypes: ['email', 'apiKey'], aiTrainingAllowed: false },
    embedding: { text: '...', keywords: ['user', 'created', 'project', 'labs'] },
  }
}
```

**1.3 Causality Tracking**
```bash
# New package: @kb-labs/logging-causality
packages/
  logging-causality/
    src/
      index.ts           # Main API
      detector.ts        # Relationship detection
      grouper.ts         # Log grouping
      storage.ts         # In-memory graph storage
    README.md
    package.json
```

**API Design:**
```typescript
import { CausalityTracker } from '@kb-labs/logging-causality';

const tracker = new CausalityTracker({ maxRecentLogs: 100 });

// Track log
const result = tracker.track({
  logId: 'log-456',
  executionId: 'exec-abc',
  timestamp: new Date().toISOString(),
  message: 'Database query failed',
  level: 'error',
});

// Result:
{
  relationships: {
    parents: [{ logId: 'log-123', relationship: 'caused-by', confidence: 0.7 }],
    group: { groupId: 'exec-abc', groupType: 'workflow', position: 2 }
  }
}

// Query
const relationships = tracker.getRelationships('log-456');
const group = tracker.getGroup('exec-abc');
```

---

### Phase 2: Integrate into Pino Adapter

**2.1 Update `@kb-labs/adapters-pino`**

```typescript
// kb-labs-adapters/packages/adapters-pino/src/index.ts
import pino from 'pino';
import type { ILogger } from '@kb-labs/core-platform';
import { ContextWindowManager } from '@kb-labs/logging-context-window';
import { enrichLogRecord } from '@kb-labs/logging-ai-enrichment';
import { CausalityTracker } from '@kb-labs/logging-causality';

export interface PinoLoggerConfig {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  pretty?: boolean;
  options?: pino.LoggerOptions;

  // 🆕 AI Features (opt-in)
  features?: {
    contextWindow?: {
      enabled: boolean;
      maxEntries?: number;
      maxSnapshots?: number;
    };
    aiEnrichment?: {
      enabled: boolean;
      semantics?: boolean;
      entities?: boolean;
      privacy?: boolean;
      embeddings?: boolean;
    };
    causality?: {
      enabled: boolean;
      maxRecentLogs?: number;
    };
  };
}

export class PinoLoggerAdapter implements ILogger {
  private pino: pino.Logger;
  private contextWindow?: ContextWindowManager;
  private enricher?: typeof enrichLogRecord;
  private causality?: CausalityTracker;

  constructor(config: PinoLoggerConfig = {}) {
    // Initialize Pino
    this.pino = pino({
      level: config.level ?? 'info',
      transport: config.pretty ? { target: 'pino-pretty' } : undefined,
      ...config.options,
    });

    // Initialize AI features if enabled
    if (config.features?.contextWindow?.enabled) {
      this.contextWindow = new ContextWindowManager({
        maxEntries: config.features.contextWindow.maxEntries ?? 50,
        maxSnapshots: config.features.contextWindow.maxSnapshots ?? 10,
      });
    }

    if (config.features?.aiEnrichment?.enabled) {
      this.enricher = enrichLogRecord;
    }

    if (config.features?.causality?.enabled) {
      this.causality = new CausalityTracker({
        maxRecentLogs: config.features.causality.maxRecentLogs ?? 100,
      });
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    let finalMeta = meta ?? {};

    // Enrich if enabled
    if (this.enricher) {
      const enriched = this.enricher({
        message,
        metadata: meta,
        level: 'info',
        timestamp: new Date().toISOString(),
      });
      finalMeta = { ...meta, enrichment: enriched.enrichment };
    }

    // Track causality if enabled
    if (this.causality) {
      const causalityResult = this.causality.track({
        logId: this.generateLogId(message, meta),
        message,
        metadata: meta,
        level: 'info',
        timestamp: new Date().toISOString(),
      });
      if (causalityResult.relationships) {
        finalMeta = { ...finalMeta, relationships: causalityResult.relationships };
      }
    }

    // Add to context window if enabled
    if (this.contextWindow) {
      this.contextWindow.add({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        metadata: finalMeta,
      });
    }

    // Log with Pino
    this.pino.info(finalMeta, message);
  }

  private generateLogId(message: string, meta?: Record<string, unknown>): string {
    const hash = `${Date.now()}:${message}`.slice(0, 50);
    return hash.replace(/[^a-zA-Z0-9]/g, '_');
  }

  // ... warn, error, debug, trace methods follow same pattern
}
```

**2.2 Configuration in `kb.config.json`**

```json
{
  "platform": {
    "adapters": {
      "logger": "@kb-labs/adapters-pino"
    },
    "adapterOptions": {
      "logger": {
        "level": "info",
        "pretty": false,
        "features": {
          "contextWindow": {
            "enabled": true,
            "maxEntries": 100,
            "maxSnapshots": 20
          },
          "aiEnrichment": {
            "enabled": true,
            "semantics": true,
            "entities": true,
            "privacy": true,
            "embeddings": true
          },
          "causality": {
            "enabled": true,
            "maxRecentLogs": 200
          }
        },
        "options": {
          "transport": {
            "targets": [
              {
                "target": "pino/file",
                "level": "info",
                "options": {
                  "destination": ".kb/logs/app.log",
                  "mkdir": true
                }
              },
              {
                "target": "@kb-labs/adapters-pino-http",
                "level": "info",
                "options": {
                  "url": "http://localhost:5050/api/v1/logs/ingest",
                  "batchSize": 50,
                  "flushIntervalMs": 3000
                }
              }
            ]
          }
        }
      }
    }
  }
}
```

---

### Phase 3: Backend Integration

**3.1 REST API Logs Endpoint**

Current file: `kb-labs-rest-api/apps/rest-api/src/routes/logs.ts`

**Add enrichment support:**
```typescript
// POST /api/v1/logs/ingest
app.post('/api/v1/logs/ingest', async (req, res) => {
  const logs = req.body.logs; // Array of log records

  // Logs already enriched by Pino adapter
  // Store in Clickhouse/Elasticsearch with enrichment fields

  await db.logs.insertMany(logs.map(log => ({
    timestamp: log.timestamp,
    level: log.level,
    message: log.message,
    metadata: log.metadata,

    // 🆕 AI enrichment fields
    semantic_intent: log.enrichment?.semantics?.intent,
    semantic_operation: log.enrichment?.semantics?.operation,
    semantic_outcome: log.enrichment?.semantics?.outcome,
    entities: log.enrichment?.entities,
    contains_pii: log.enrichment?.privacy?.containsPII,
    pii_types: log.enrichment?.privacy?.piiTypes,
    embedding_text: log.enrichment?.embedding?.text,

    // 🆕 Causality fields
    relationship_parents: log.relationships?.parents,
    group_id: log.relationships?.group?.groupId,
    group_type: log.relationships?.group?.groupType,
  })));

  res.status(200).json({ received: logs.length });
});
```

**3.2 Query API for Context Window**

```typescript
// GET /api/v1/logs/context/:logId
app.get('/api/v1/logs/context/:logId', async (req, res) => {
  const { logId } = req.params;
  const { count = 10, timeWindowMs = 5000 } = req.query;

  // Query from Clickhouse/Elasticsearch
  // ORDER BY timestamp DESC LIMIT count
  // WHERE timestamp < (SELECT timestamp FROM logs WHERE logId = ?)
  // AND timestamp > (SELECT timestamp FROM logs WHERE logId = ?) - timeWindowMs

  const precedingLogs = await db.logs.findPrecedingEvents(logId, count, timeWindowMs);

  res.json({ precedingLogs });
});

// GET /api/v1/logs/group/:groupId
app.get('/api/v1/logs/group/:groupId', async (req, res) => {
  const { groupId } = req.params;

  const group = await db.logs.find({ 'relationships.group.groupId': groupId });

  res.json({ group });
});
```

---

## 🎯 Immediate Action Plan

### Step 1: Document & Extract (This Document) ✅

### Step 2: Create Standalone Packages
```bash
# Create packages
pnpm create @kb-labs/logging-context-window
pnpm create @kb-labs/logging-ai-enrichment
pnpm create @kb-labs/logging-causality

# Copy code from core-sys/logging
# Update imports to be standalone
# Add tests
# Publish to npm (workspace packages)
```

### Step 3: Update Pino Adapter
```bash
# Add dependencies to adapters-pino/package.json
{
  "dependencies": {
    "@kb-labs/logging-context-window": "workspace:*",
    "@kb-labs/logging-ai-enrichment": "workspace:*",
    "@kb-labs/logging-causality": "workspace:*"
  }
}

# Update index.ts with integration code (see Phase 2.1 above)
```

### Step 4: Update Config Schema
```bash
# Update kb.config.json schema to include logger.features
# Document new configuration options
# Add validation
```

### Step 5: Clean Up core-sys/logging
```bash
# Delete unused files:
- sinks/ (all custom sinks)
- adapters/ (Sentry, Datadog, Loki, Elasticsearch)
- metrics.ts, health.ts, shutdown.ts
- ai-config.ts
- config-loader.ts

# Keep minimal:
- types/ (LogRecord type)
- logger.ts (basic getLogger for CLI bootstrap)
- init.ts (basic initLogging)
- state.ts (global state)

# Mark as deprecated in docs
```

---

## 📊 Value Assessment

| Feature | Lines of Code | Value | Integration Effort | Priority |
|---------|---------------|-------|-------------------|----------|
| **Context Window** | 273 | HIGH | LOW | ⭐⭐⭐ |
| **AI Enrichment** | 373 | HIGH | MEDIUM | ⭐⭐⭐ |
| **Causality Tracking** | 371 | MEDIUM-HIGH | MEDIUM | ⭐⭐ |
| **Redaction** | ? | MEDIUM | LOW | ⭐ |
| **Total** | ~1,000+ | - | - | - |

**Total preserved value:** ~1,000 lines of high-quality, AI-ready code

---

## 🚀 Future Enhancements

Once extracted and integrated:

1. **Vector Search** - Store embedding_text in Qdrant for semantic log search
2. **LLM Error Diagnosis** - Send context window + causality graph to LLM
3. **Anomaly Detection** - Train ML models on semantic intent patterns
4. **Privacy Dashboard** - Show PII exposure across logs
5. **Causality Graph Visualization** - Build interactive graph UI
6. **Smart Alerts** - Trigger alerts based on semantic patterns, not just keywords

---

## 📝 Summary

**What we're saving:**
- ✅ Context Window (273 lines) - Sliding window of recent events
- ✅ AI Enrichment (373 lines) - Semantic analysis, entity extraction, PII detection
- ✅ Causality Tracking (371 lines) - Event graph, relationship detection

**What we're deleting:**
- ❌ Custom Sinks (use Pino transports)
- ❌ Metrics/Health (move to observability package)
- ❌ Custom Adapters (use Pino ecosystem)
- ❌ AI Config System (simplify to feature flags)

**End Result:**
- 🎯 3 standalone packages (~1,000 lines total)
- 🔌 Optional integration into Pino adapter
- 📊 Ready for AI/ML workloads
- 🔒 Privacy-first with PII detection
- 🐛 Better debugging with context + causality

**ROI:** High-value features extracted and preserved, technical debt removed.

---

**Next Steps:** Review this document, approve extraction plan, create packages.
