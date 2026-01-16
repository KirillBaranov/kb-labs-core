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
 * Tool definition for native tool calling.
 */
export interface LLMTool {
  /** Tool name (must be valid identifier) */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for tool input parameters */
  inputSchema: Record<string, any>;
}

/**
 * Tool call from LLM.
 */
export interface LLMToolCall {
  /** Unique call ID */
  id: string;
  /** Tool name */
  name: string;
  /** Tool input (validated against schema) */
  input: unknown;
}

/**
 * Message in a conversation.
 */
export interface LLMMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** Message content (text or tool results) */
  content: string;
  /** Tool call ID (for tool role) */
  toolCallId?: string;
}

/**
 * Options for native tool calling.
 */
export interface LLMToolCallOptions extends LLMOptions {
  /** Available tools */
  tools: LLMTool[];
  /** Force tool usage (optional) */
  toolChoice?: 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

/**
 * Response from native tool calling.
 */
export interface LLMToolCallResponse extends LLMResponse {
  /** Tool calls requested by LLM (if any) */
  toolCalls?: LLMToolCall[];
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

  /**
   * Chat with native tool calling support (optional).
   *
   * If implemented, enables native LLM tool calling (e.g., OpenAI function calling, Claude tool use).
   * If not implemented, AgentExecutor falls back to text-based tool prompting.
   *
   * @param messages - Conversation history
   * @param options - Options including tools and tool choice
   * @returns Response with optional tool calls
   */
  chatWithTools?(
    messages: LLMMessage[],
    options: LLMToolCallOptions
  ): Promise<LLMToolCallResponse>;
}
