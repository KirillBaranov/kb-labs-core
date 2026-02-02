/**
 * @module @kb-labs/core-sys/logging/ai-enrichment
 * AI enrichment functions for log records
 */

import type { LogRecord, LogLevel } from './types';
import { getGlobalState } from './state';
import { trackCausality } from './causality-tracker';
import { addToContextWindow } from './context-window';

/**
 * Infer semantic intent from log message and level
 */
function inferSemanticIntent(msg: string, level: LogLevel): {
    intent?: 'action' | 'state' | 'error' | 'metric' | 'decision';
    operation?: string;
    outcome?: 'success' | 'failure' | 'partial' | 'pending';
} {
    const lowerMsg = msg.toLowerCase();
    
    // Determine intent from patterns
    let intent: 'action' | 'state' | 'error' | 'metric' | 'decision' | undefined;
    let operation: string | undefined;
    let outcome: 'success' | 'failure' | 'partial' | 'pending' | undefined;
    
    // Error intent
    if (level === 'error' || level === 'warn') {
        intent = 'error';
        outcome = 'failure';
    }
    // Metric intent
    else if (lowerMsg.includes('took') || lowerMsg.includes('duration') || lowerMsg.includes('ms') || lowerMsg.includes('seconds')) {
        intent = 'metric';
        outcome = 'success';
    }
    // Action intent (most common)
    else if (
        lowerMsg.includes('created') || lowerMsg.includes('deleted') || 
        lowerMsg.includes('updated') || lowerMsg.includes('executed') ||
        lowerMsg.includes('started') || lowerMsg.includes('completed') ||
        lowerMsg.includes('finished') || lowerMsg.includes('processed')
    ) {
        intent = 'action';
        outcome = 'success'; // Already checked for error/warn above
        
        // Extract operation
        if (lowerMsg.includes('created')) {operation = 'create';}
        else if (lowerMsg.includes('deleted')) {operation = 'delete';}
        else if (lowerMsg.includes('updated')) {operation = 'update';}
        else if (lowerMsg.includes('read') || lowerMsg.includes('fetched')) {operation = 'read';}
        else if (lowerMsg.includes('executed') || lowerMsg.includes('processed')) {operation = 'execute';}
    }
    // State intent
    else if (
        lowerMsg.includes('initialized') || lowerMsg.includes('ready') ||
        lowerMsg.includes('connected') || lowerMsg.includes('disconnected')
    ) {
        intent = 'state';
        outcome = 'success';
    }
    // Decision intent
    else if (lowerMsg.includes('decided') || lowerMsg.includes('chose') || lowerMsg.includes('selected')) {
        intent = 'decision';
        outcome = 'success';
    }
    
    // Default: action with outcome based on level
    if (!intent) {
        intent = 'action';
        outcome = (level === 'error' || level === 'warn') ? 'failure' : 'success';
    }
    
    return { intent, operation, outcome };
}

/**
 * Extract entities from meta object based on key patterns
 */
function extractEntitiesFromMeta(meta?: Record<string, unknown>): Array<{ type: string; value: string }> {
    if (!meta) {return [];}
    
    const entities: Array<{ type: string; value: string }> = [];
    
    // Common patterns: *Id, *Name, *Email, *Url, etc.
    for (const [key, value] of Object.entries(meta)) {
        if (typeof value !== 'string') {continue;}
        
        const lowerKey = key.toLowerCase();
        
        if (lowerKey.endsWith('id') || lowerKey.endsWith('_id')) {
            const entityType = lowerKey.replace(/[_-]?id$/, '') || 'id';
            entities.push({ type: entityType, value: String(value) });
        } else if (lowerKey.endsWith('name') || lowerKey.endsWith('_name')) {
            const entityType = lowerKey.replace(/[_-]?name$/, '') || 'name';
            entities.push({ type: entityType, value: String(value) });
        } else if (lowerKey.includes('email')) {
            entities.push({ type: 'email', value: String(value) });
        } else if (lowerKey.includes('url') || lowerKey.includes('uri')) {
            entities.push({ type: 'url', value: String(value) });
        } else if (lowerKey.includes('user')) {
            entities.push({ type: 'user', value: String(value) });
        } else if (lowerKey.includes('project')) {
            entities.push({ type: 'project', value: String(value) });
        } else if (lowerKey.includes('task')) {
            entities.push({ type: 'task', value: String(value) });
        }
    }
    
    return entities;
}

/**
 * Detect PII using regex patterns
 */
function detectPII(msg: string, meta?: Record<string, unknown>): {
    containsPII: boolean;
    piiTypes: string[];
} {
    const piiTypes: string[] = [];
    
    // Email pattern
    const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
    if (emailPattern.test(msg) || (meta && Object.values(meta).some(v => typeof v === 'string' && emailPattern.test(v)))) {
        piiTypes.push('email');
    }
    
    // Phone pattern (international format)
    const phonePattern = /\+?[1-9]\d{1,14}/;
    if (phonePattern.test(msg) || (meta && Object.values(meta).some(v => typeof v === 'string' && phonePattern.test(v)))) {
        piiTypes.push('phone');
    }
    
    // Credit card pattern
    const ccPattern = /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/;
    if (ccPattern.test(msg) || (meta && Object.values(meta).some(v => typeof v === 'string' && ccPattern.test(v)))) {
        piiTypes.push('creditCard');
    }
    
    // SSN pattern (US)
    const ssnPattern = /\d{3}-\d{2}-\d{4}/;
    if (ssnPattern.test(msg) || (meta && Object.values(meta).some(v => typeof v === 'string' && ssnPattern.test(v)))) {
        piiTypes.push('ssn');
    }
    
    // API Key patterns (common formats)
    // - Bearer tokens: starts with "Bearer " or long alphanumeric strings
    // - API keys: usually 32+ characters, alphanumeric with dashes/underscores
    // - JWT tokens: three base64 parts separated by dots
    const apiKeyPatterns = [
        /Bearer\s+[A-Za-z0-9\-_]{20,}/i,  // Bearer tokens
        /[A-Za-z0-9\-_]{32,}/,            // Long API keys
        /[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/, // JWT tokens
        /sk-[A-Za-z0-9]{32,}/i,          // Stripe-like keys
        /pk_[A-Za-z0-9]{32,}/i,          // Public keys
        /[A-Za-z0-9]{40,}/,              // SHA-1 like hashes (GitHub tokens, etc.)
    ];
    
    const checkApiKey = (text: string): boolean => {
        return apiKeyPatterns.some(pattern => pattern.test(text));
    };
    
    if (checkApiKey(msg) || (meta && Object.values(meta).some(v => typeof v === 'string' && checkApiKey(v)))) {
        piiTypes.push('apiKey');
    }
    
    // Check for sensitive keys in meta (case-insensitive)
    if (meta) {
        const sensitiveKeyPatterns = [
            /^(api[_-]?key|apikey)$/i,
            /^(secret[_-]?key|secretkey)$/i,
            /^(access[_-]?token|accesstoken)$/i,
            /^(refresh[_-]?token|refreshtoken)$/i,
            /^(auth[_-]?token|authtoken)$/i,
            /^(bearer[_-]?token|bearertoken)$/i,
            /^(password|passwd|pwd)$/i,
            /^(private[_-]?key|privatekey)$/i,
            /^(env|environment|config)$/i, // Env variables that might contain secrets
        ];
        
        const hasSensitiveKey = Object.keys(meta).some(key => 
            sensitiveKeyPatterns.some(pattern => pattern.test(key))
        );
        
        if (hasSensitiveKey && !piiTypes.includes('apiKey')) {
            piiTypes.push('apiKey');
        }
    }
    
    return {
        containsPII: piiTypes.length > 0,
        piiTypes,
    };
}

/**
 * Prepare text for embedding
 */
function prepareEmbeddingText(rec: LogRecord): string {
    const parts: string[] = [];
    
    // Add plugin/command context
    if (rec.plugin) {parts.push(`plugin:${rec.plugin}`);}
    if (rec.command) {parts.push(`command:${rec.command}`);}
    if (rec.category) {parts.push(`category:${rec.category}`);}
    
    // Add message
    if (rec.msg) {parts.push(rec.msg);}
    
        // Add key meta fields (exclude sensitive data)
        if (rec.meta) {
            const sensitiveKeyPatterns = [
                /^(api[_-]?key|apikey|secret[_-]?key|secretkey|access[_-]?token|refresh[_-]?token|auth[_-]?token|bearer[_-]?token|password|passwd|pwd|private[_-]?key|privatekey|token)$/i,
                /^(env|environment|config)$/i, // Env variables
            ];
            
            const keyFields = Object.entries(rec.meta)
                .filter(([k]) => !sensitiveKeyPatterns.some(pattern => pattern.test(k)))
                .slice(0, 5) // Limit to 5 key fields
                .map(([k, v]) => {
                    // Also check value for sensitive patterns
                    const valueStr = String(v);
                    if (valueStr.length > 50 || /[A-Za-z0-9\-_]{32,}/.test(valueStr)) {
                        // Likely sensitive, skip
                        return null;
                    }
                    return `${k}:${valueStr}`;
                })
                .filter((v): v is string => v !== null);
            
            if (keyFields.length > 0) {
                parts.push(...keyFields);
            }
        }
    
    return parts.join(' ');
}

/**
 * Extract keywords from message
 */
function extractKeywords(msg: string): string[] {
    // Simple keyword extraction: split by common separators and filter
    // Limit to 10 keywords
    
    return msg
        .toLowerCase()
        .split(/[\s\-_.,;:!?()\[\]{}]+/)
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(w))
        .slice(0, 10);
}

/**
 * Map log level to severity (0-10)
 */
function levelToSeverity(level: LogLevel): number {
    const map: Record<LogLevel, number> = {
        trace: 1,
        debug: 2,
        info: 5,
        warn: 7,
        error: 10,
        silent: 0,  // silent = lowest severity (never logged)
    };
    return map[level] || 5;
}

/**
 * Enrich log record with AI fields based on configuration
 */
export function enrichLogRecord(rec: LogRecord): LogRecord {
    const state = getGlobalState();
    const aiConfig = state.aiConfig;
    
    // If AI is disabled, return record as-is
    if (!aiConfig || aiConfig.mode === 'off') {
        return rec;
    }
    
    const enriched: LogRecord = { ...rec };
    const features = aiConfig.features;
    
    // Basic mode: pattern-based enrichment
    if (aiConfig.mode === 'basic' || aiConfig.mode === 'full') {
        // Semantic inference
        if (features?.semanticTags !== false && rec.msg) {
            const semantic = inferSemanticIntent(rec.msg, rec.level);
            enriched.semantics = {
                intent: semantic.intent,
                operation: semantic.operation,
                outcome: semantic.outcome,
                domain: rec.category?.split(':')[0] || rec.plugin || 'general',
            };
        }
        
        // Entity extraction
        if (features?.nlp?.enabled !== false && rec.meta) {
            const entities = extractEntitiesFromMeta(rec.meta);
            if (entities.length > 0) {
                enriched.nlp = {
                    entities,
                };
            }
        }
        
        // Privacy detection
        if (features?.privacy?.autoDetectPII !== false) {
            const privacy = detectPII(rec.msg || '', rec.meta);
            if (privacy.containsPII || features?.privacy?.defaultSensitivity) {
                enriched.privacy = {
                    containsPII: privacy.containsPII,
                    piiTypes: privacy.piiTypes.length > 0 ? privacy.piiTypes : undefined,
                    sensitivity: features?.privacy?.defaultSensitivity || 'confidential',
                    aiTraining: {
                        allowed: !privacy.containsPII, // Don't allow training on PII by default
                        anonymize: privacy.containsPII,
                    },
                };
            }
        }
        
        // Embedding text preparation
        if (features?.embeddings?.enabled !== false) {
            const embeddingText = prepareEmbeddingText(rec);
            if (embeddingText) {
                enriched.embedding = {
                    embeddingText,
                    embeddingMeta: {
                        logType: rec.category || 'general',
                        severity: levelToSeverity(rec.level),
                        domain: rec.category?.split(':')[0] || rec.plugin || 'general',
                        keywords: extractKeywords(rec.msg || ''),
                    },
                };
            }
        }
        
        // AI schema version
        enriched.ai = {
            schemaVersion: '1.0.0',
            supportedFeatures: ['embedding', 'semantics'],
        };
    }
    
    // Full mode: additional features
    if (aiConfig.mode === 'full') {
        // Causality tracking
        if (features?.causality?.enabled !== false) {
            const causality = trackCausality(enriched);
            if (causality.relationships) {
                enriched.relationships = causality.relationships;
            }
        }
        
        // Context windows
        if (features?.contextWindows?.enabled !== false) {
            addToContextWindow(enriched);
        }
        
        // ML-based features will be added later
    }
    
    // Basic mode: basic causality tracking (if enabled)
    if (aiConfig.mode === 'basic' && features?.causality?.enabled === true) {
        const causality = trackCausality(enriched);
        if (causality.relationships) {
            enriched.relationships = causality.relationships;
        }
    }
    
    return enriched;
}

