/**
 * @module @kb-labs/core-sys/logging/ai-config
 * AI logging configuration functions
 */

import type { AIConfig } from './types';
import { getGlobalState } from './state';

/**
 * Configure AI logging features
 * 
 * @param config - AI configuration
 * 
 * @example
 * ```typescript
 * configureAI({ mode: 'basic' });
 * ```
 */
export function configureAI(config: AIConfig): void {
    const state = getGlobalState();
    state.aiConfig = config;
}

/**
 * Get current AI configuration
 */
export function getAIConfig(): AIConfig | undefined {
    const state = getGlobalState();
    return state.aiConfig;
}

/**
 * Check if AI enrichment is enabled
 */
export function isAIEnabled(): boolean {
    const state = getGlobalState();
    return state.aiConfig?.mode !== undefined && state.aiConfig.mode !== 'off';
}


