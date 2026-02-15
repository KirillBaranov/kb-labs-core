/**
 * @module @kb-labs/core-platform/adapters/llm
 * LLM (Large Language Model) abstraction for text generation.
 */

/**
 * Metadata for LLM request tracking and analytics.
 * Passed through the chain from LLMRouter to AnalyticsLLM.
 */
export interface LLMRequestMetadata {
  /** Tier used for this request */
  tier?: import("./llm-types.js").LLMTier;
  /** Provider identifier (e.g., 'openai', 'anthropic') */
  provider?: string;
  /** Resource name in broker (e.g., 'llm:openai') */
  resource?: string;
}

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
  /** Metadata for analytics and observability (set by LLMRouter) */
  metadata?: LLMRequestMetadata;
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
  role: "system" | "user" | "assistant" | "tool";
  /** Message content (text or tool results) */
  content: string;
  /** Tool call ID (for tool role - identifies which tool call this result belongs to) */
  toolCallId?: string;
  /** Tool calls made by assistant (for assistant role - when LLM requests tool execution) */
  toolCalls?: LLMToolCall[];
  /** Metadata from tool execution (e.g., reflection results, file counts, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Options for native tool calling.
 */
export interface LLMToolCallOptions extends LLMOptions {
  /** Available tools */
  tools: LLMTool[];
  /**
   * Control tool usage:
   * - 'auto': LLM decides whether to call tools
   * - 'required': LLM must call at least one tool
   * - 'none': LLM cannot call tools (text-only response)
   * - { type: 'function', function: { name: 'tool_name' } }: Force specific tool
   */
  toolChoice?:
    | "auto"
    | "required"
    | "none"
    | { type: "function"; function: { name: string } };
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
    options: LLMToolCallOptions,
  ): Promise<LLMToolCallResponse>;
}
