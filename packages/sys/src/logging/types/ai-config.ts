/**
 * @module @kb-labs/core-sys/logging/types/ai-config
 * AI logging configuration types
 */

/**
 * AI logging mode
 */
export type AIMode = 'off' | 'basic' | 'full';

/**
 * AI features configuration
 */
export interface AIFeaturesConfig {
    semanticTags?: boolean;
    embeddings?: {
        enabled: boolean;
        mode?: 'sync' | 'async';
        batchSize?: number;
    };
    nlp?: {
        enabled: boolean;
        extractEntities?: boolean;
        sentiment?: boolean;
    };
    privacy?: {
        autoDetectPII?: boolean;
        mode?: 'regex' | 'ml';
        anonymizeForTraining?: boolean;
        defaultSensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
    };
    causality?: {
        enabled: boolean;
        trackRelationships?: boolean;
        maxDepth?: number;
    };
    contextWindows?: {
        enabled: boolean;
        precedingEvents?: number;
        systemStateSnapshot?: boolean;
    };
}

/**
 * AI logging configuration
 */
export interface AIConfig {
    mode: AIMode;
    features?: AIFeaturesConfig;
}

