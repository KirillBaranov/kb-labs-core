/**
 * @module @kb-labs/core-platform/adapters/llm
 * LLM (Large Language Model) abstraction for text generation.
 */

/**
 * Options for LLM completion.
 */
export interface LLMOptions {
  /** Model identifier (e.g., 'gpt-4', 'claude-3-opus') */
  model?: string;
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stop?: string[];
  /** System prompt/instruction */
  systemPrompt?: string;
}

/**
 * LLM completion response.
 */
export interface LLMResponse {
  /** Generated text content */
  content: string;
  /** Token usage statistics */
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  /** Model used for generation */
  model: string;
}

/**
 * LLM adapter interface.
 * Implementations: @kb-labs/shared-openai, @kb-labs/shared-anthropic (production), MockLLM (noop)
 */
export interface ILLM {
  /**
   * Generate a completion for the given prompt.
   * @param prompt - Text prompt
   * @param options - Optional generation options
   */
  complete(prompt: string, options?: LLMOptions): Promise<LLMResponse>;

  /**
   * Stream a completion for the given prompt.
   * @param prompt - Text prompt
   * @param options - Optional generation options
   */
  stream(prompt: string, options?: LLMOptions): AsyncIterable<string>;
}
