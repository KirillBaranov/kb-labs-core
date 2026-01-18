/**
 * @module @kb-labs/core-platform/wrappers/analytics-llm
 * AnalyticsLLM - ILLM wrapper that tracks usage to analytics.
 */

import type {
  ILLM,
  LLMOptions,
  LLMResponse,
  LLMMessage,
  LLMToolCallOptions,
  LLMToolCallResponse,
} from '../adapters/llm.js';
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

    // Extract routing metadata (set by LLMRouter)
    const metadata = options?.metadata;

    // Track start
    await this.analytics.track('llm.completion.started', {
      requestId,
      tier: metadata?.tier,
      provider: metadata?.provider,
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
        tier: metadata?.tier,
        provider: metadata?.provider,
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
        tier: metadata?.tier,
        provider: metadata?.provider,
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

    // Extract routing metadata (set by LLMRouter)
    const metadata = options?.metadata;

    await this.analytics.track('llm.stream.started', {
      requestId,
      tier: metadata?.tier,
      provider: metadata?.provider,
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
        tier: metadata?.tier,
        provider: metadata?.provider,
        model: options?.model,
        durationMs: Date.now() - startTime,
        totalChunks,
        totalLength,
      });
    } catch (error) {
      await this.analytics.track('llm.stream.error', {
        requestId,
        tier: metadata?.tier,
        provider: metadata?.provider,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Chat with native tool calling support (optional).
   * Proxies to underlying LLM if it supports chatWithTools.
   */
  async chatWithTools(
    messages: LLMMessage[],
    options: LLMToolCallOptions
  ): Promise<LLMToolCallResponse> {
    // Check if underlying LLM supports chatWithTools
    if (!this.realLLM.chatWithTools) {
      throw new Error('Underlying LLM does not support chatWithTools');
    }

    const startTime = Date.now();
    const requestId = generateRequestId();

    // Extract routing metadata (set by LLMRouter)
    const metadata = options?.metadata;

    // Track start
    await this.analytics.track('llm.chatWithTools.started', {
      requestId,
      tier: metadata?.tier,
      provider: metadata?.provider,
      model: options?.model,
      messageCount: messages.length,
      toolCount: options.tools.length,
      toolChoice: options.toolChoice,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    try {
      // Execute real LLM call with tools
      const response = await this.realLLM.chatWithTools(messages, options);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Track completion
      await this.analytics.track('llm.chatWithTools.completed', {
        requestId,
        tier: metadata?.tier,
        provider: metadata?.provider,
        model: response.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.promptTokens + response.usage.completionTokens,
        toolCallCount: response.toolCalls?.length ?? 0,
        toolNames: response.toolCalls?.map((tc) => tc.name) ?? [],
        durationMs,
        estimatedCost: estimateCost(response),
      });

      return response;
    } catch (error) {
      // Track error
      await this.analytics.track('llm.chatWithTools.error', {
        requestId,
        tier: metadata?.tier,
        provider: metadata?.provider,
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
 * Prices as of 2025-01 (USD per 1M tokens).
 *
 * Note: OpenAI API returns versioned snapshot names (e.g., 'gpt-4o-mini-2024-07-18')
 * even when using aliases (e.g., 'gpt-4o-mini'). We match by prefix using longest-first
 * sorting to ensure specific models match before generic ones.
 *
 * See ADR-0041 for details: docs/adr/0041-llm-cost-calculation-fix.md
 */
function estimateCost(response: LLMResponse): number {
  const model = response.model.toLowerCase();
  const { promptTokens, completionTokens } = response.usage;

  // Pricing map (input / output per 1M tokens)
  // Source: OpenAI Pricing (2025-01), Anthropic Pricing (2025-01)
  const pricing: Record<string, { input: number; output: number }> = {
    // OpenAI models (2025-01 pricing)
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },

    // Claude models (2025-01 pricing)
    'claude-3-opus': { input: 15.00, output: 75.00 },
    'claude-3-sonnet': { input: 3.00, output: 15.00 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
  };

  // Sort keys by length (longest first) to match specific models before generic ones
  // Example: 'gpt-4o-mini' should match before 'gpt-4o'
  // This handles versioned names: 'gpt-4o-mini-2024-07-18' → 'gpt-4o-mini' ✅
  const sortedKeys = Object.keys(pricing).sort((a, b) => b.length - a.length);

  // Find matching pricing
  let modelPricing = pricing['gpt-4o-mini']; // Default to cheapest OpenAI model
  for (const key of sortedKeys) {
    if (model.includes(key)) {
      modelPricing = pricing[key]!;
      break;
    }
  }

  // Calculate cost (per 1M tokens)
  const inputCost = (promptTokens / 1_000_000) * (modelPricing?.input ?? 0);
  const outputCost = (completionTokens / 1_000_000) * (modelPricing?.output ?? 0);

  return inputCost + outputCost;
}
