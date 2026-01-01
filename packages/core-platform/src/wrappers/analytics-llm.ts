/**
 * @module @kb-labs/core-platform/wrappers/analytics-llm
 * AnalyticsLLM - ILLM wrapper that tracks usage to analytics.
 */

import type { ILLM, LLMOptions, LLMResponse } from '../adapters/llm.js';
import type { IAnalytics } from '../adapters/analytics.js';

/**
 * ILLM wrapper that tracks all LLM calls to analytics.
 *
 * Features:
 * - Tracks every LLM completion with token usage
 * - Records model, prompt/completion tokens, timestamps
 * - Transparent (implements ILLM interface)
 * - Automatically calculates cost estimates
 *
 * Tracked metrics:
 * - llm.completion.started
 * - llm.completion.completed (with usage, duration, model)
 * - llm.completion.error (with error details)
 *
 * @example
 * ```typescript
 * const trackedLLM = new AnalyticsLLM(realLLM, analytics);
 *
 * // Automatically tracked
 * const response = await trackedLLM.complete('Hello');
 * // → Tracks: model, tokens, duration
 * ```
 */
export class AnalyticsLLM implements ILLM {
  constructor(
    private realLLM: ILLM,
    private analytics: IAnalytics
  ) {}

  /**
   * Generate a completion with analytics tracking.
   */
  async complete(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Track start
    await this.analytics.track('llm.completion.started', {
      requestId,
      model: options?.model,
      promptLength: prompt.length,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    try {
      // Execute real LLM call
      const response = await this.realLLM.complete(prompt, options);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Track completion
      await this.analytics.track('llm.completion.completed', {
        requestId,
        model: response.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.promptTokens + response.usage.completionTokens,
        durationMs,
        estimatedCost: estimateCost(response),
      });

      return response;
    } catch (error) {
      // Track error
      await this.analytics.track('llm.completion.error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Stream a completion.
   * Note: Streaming is harder to track token-by-token, so we track start/end only.
   */
  async *stream(prompt: string, options?: LLMOptions): AsyncIterable<string> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    await this.analytics.track('llm.stream.started', {
      requestId,
      model: options?.model,
      promptLength: prompt.length,
    });

    try {
      let totalChunks = 0;
      let totalLength = 0;

      for await (const chunk of this.realLLM.stream(prompt, options)) {
        totalChunks++;
        totalLength += chunk.length;
        yield chunk;
      }

      await this.analytics.track('llm.stream.completed', {
        requestId,
        model: options?.model,
        durationMs: Date.now() - startTime,
        totalChunks,
        totalLength,
      });
    } catch (error) {
      await this.analytics.track('llm.stream.error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });

      throw error;
    }
  }
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `llm-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Estimate cost based on model and token usage.
 * Prices as of 2024 (approximate, USD per 1K tokens).
 */
function estimateCost(response: LLMResponse): number {
  const model = response.model.toLowerCase();
  const { promptTokens, completionTokens } = response.usage;

  // Pricing map (input / output per 1K tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  };

  // Find matching pricing
  let modelPricing = pricing['gpt-3.5-turbo']; // Default fallback
  for (const [key, price] of Object.entries(pricing)) {
    if (model.includes(key)) {
      modelPricing = price;
      break;
    }
  }

  const inputCost = (promptTokens / 1000) * (modelPricing?.input ?? 0);
  const outputCost = (completionTokens / 1000) * (modelPricing?.output ?? 0);

  return inputCost + outputCost;
}
