export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent";

// Уровни verbosity (пользовательские)
export type VerbosityLevel = "quiet" | "normal" | "verbose" | "debug" | "inspect";

// Режимы вывода
export type OutputMode = "tty" | "pipe" | "ci" | "json";

// Формат debug вывода
export type DebugFormat = "human" | "ai";

export interface LogRecord {
    time: string;                // ISO timestamp (legacy, use ts)
    ts?: string;                 // ISO timestamp (new)
    level: LogLevel;
    category?: string;           // e.g. "core", "ai-review", "provider"
    plugin?: string;             // ID плагина
    command?: string;            // ID команды
    trace?: string;              // Trace ID
    span?: string;               // Span ID
    parentSpan?: string;         // Parent Span ID (for hierarchy)
    executionId?: string;        // Execution ID (for workflow/command execution tracking)
    msg?: string;
    err?: { name: string; message: string; stack?: string; code?: string };
    meta?: Record<string, unknown>;
    metrics?: {                 // Метрики
        duration?: number;
        memory?: number;
        [key: string]: unknown;
    };
    
    // AI-ready fields (optional, only added when AI mode is enabled)
    semantics?: {
        intent?: 'action' | 'state' | 'error' | 'metric' | 'decision';
        domain?: string;           // e.g. 'auth', 'payment', 'data-processing'
        operation?: string;        // e.g. 'create', 'read', 'update', 'delete', 'execute'
        outcome?: 'success' | 'failure' | 'partial' | 'pending';
        causality?: {
            causes?: string[];      // IDs событий, вызвавших это
            effects?: string[];     // IDs событий, которые это вызвало
        };
    };
    
    nlp?: {
        language?: string;       // Язык сообщения
        entities?: Array<{       // Извлеченные сущности
            type: string;          // 'user', 'resource', 'action'
            value: string;
            confidence?: number;
        }>;
        sentiment?: 'positive' | 'negative' | 'neutral';
    };
    
    embedding?: {
        embeddingText?: string;    // Очищенный, структурированный текст для векторизации
        embeddingMeta?: {
            logType: string;         // Тип лога для группировки
            severity: number;        // 0-10 (для взвешивания)
            domain: string;          // Домен для namespace
            keywords: string[];      // Ключевые слова
        };
        embeddingVersion?: string;  // Версия модели embedding
    };
    
    privacy?: {
        sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
        aiTraining?: {
            allowed: boolean;
            anonymize?: boolean;
            retention?: string;       // '30d', '1y'
            geolocation?: string;     // Ограничения по геолокации
        };
        containsPII?: boolean;
        piiTypes?: string[];          // ['email', 'phone', 'ssn']
        compliance?: string[];        // ['GDPR', 'HIPAA', 'SOC2']
    };
    
    relationships?: {
        parents?: Array<{
            logId: string;
            relationship: 'caused-by' | 'triggered-by' | 'follows' | 'depends-on';
            confidence?: number;
        }>;
        children?: Array<{
            logId: string;
            relationship: 'causes' | 'triggers' | 'precedes' | 'enables';
            confidence?: number;
        }>;
        group?: {
            groupId: string;         // ID группы связанных событий
            groupType: string;       // 'transaction', 'workflow', 'cascade'
            position: number;        // Позиция в группе
        };
    };
    
    ai?: {
        schemaVersion: string;       // Версия формата логов для AI
        supportedFeatures?: string[]; // ['embedding', 'causality', 'feedback']
        minAIVersion?: string;
    };
}

export interface LogSink {
    handle(rec: LogRecord): void | Promise<void>;
    /** Optional sink identifier for health checks and metrics */
    id?: string;
    /** Optional health check function */
    health?: () => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
    /** Optional flush function for graceful shutdown */
    flush?: () => Promise<void> | void;
}

export interface Redactor {
    (rec: LogRecord): LogRecord;
}

export interface ConfigureOpts {
    level?: LogLevel;
    sinks?: LogSink[];                   // replaces sinks if provided
    replaceSinks?: boolean;              // if true, replace all sinks; if false, add to existing (default: true for first init, false after)
    redactor?: Redactor | null;          // null disables redaction
    categoryFilter?: string[] | RegExp;  // allow-list; empty => all
    clock?: () => Date;                  // for tests
}

export interface Logger {
    debug(msg: string, meta?: Record<string, unknown>): void;
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown> | Error): void;
    child(bindings: { category?: string; meta?: Record<string, unknown> }): Logger;
}

// Re-export AI config types
export type { AIMode, AIFeaturesConfig, AIConfig } from './ai-config';