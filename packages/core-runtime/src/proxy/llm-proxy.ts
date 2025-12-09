/**
 * @module @kb-labs/core-runtime/proxy
 * IPC proxy for ILLM adapter.
 *
 * This proxy forwards all LLM operations to the parent process via IPC.
 * The parent process owns the real LLM adapter (e.g., OpenAILLM).
 *
 * Benefits:
 * - Single LLM instance (shared rate limiter across all workers)
 * - Reduced memory usage (no duplicate API clients)
 * - Centralized quota enforcement (tenant rate limits)
 *
 * Note: `stream()` method is NOT supported over IPC (returns empty async iterable).
 * Use `complete()` for one-shot completions.
 *
 * @example
 * ```typescript
 * import { LLMProxy, createIPCTransport } from '@kb-labs/core-runtime';
 *
 * // In child process (sandbox worker)
 * const transport = createIPCTransport();
 * const llm = new LLMProxy(transport);
 *
 * // Use like normal ILLM
 * const response = await llm.complete('What is TypeScript?', {
 *   model: 'gpt-4',
 *   temperature: 0.7,
 *   maxTokens: 500,
 * });
 * ```
 */

import type { ILLM, LLMOptions, LLMResponse } from '@kb-labs/core-platform';
import type { ITransport } from '../transport/transport';
import { RemoteAdapter } from './remote-adapter';

/**
 * IPC proxy for ILLM adapter.
 *
 * All method calls are forwarded to the parent process via IPC.
 * The parent process executes the call on the real LLM adapter
 * (e.g., OpenAILLM) and returns the result.
 *
 * **Limitation**: `stream()` method is not supported over IPC.
 * Streaming requires bidirectional communication which is not
 * currently implemented. Use `complete()` for one-shot completions.
 */
export class LLMProxy extends RemoteAdapter<ILLM> implements ILLM {
  /**
   * Create an LLM proxy.
   *
   * @param transport - IPC transport to communicate with parent
   */
  constructor(transport: ITransport) {
    super('llm', transport);
  }

  /**
   * Generate a completion for the given prompt.
   *
   * @param prompt - Text prompt
   * @param options - Optional generation options
   * @returns LLM response with content and token usage
   */
  async complete(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    return (await this.callRemote('complete', [prompt, options])) as LLMResponse;
  }

  /**
   * Stream a completion for the given prompt.
   *
   * **NOT SUPPORTED over IPC**: Returns empty async iterable.
   *
   * Streaming requires bidirectional communication which is not
   * currently implemented in the IPC protocol. Use `complete()`
   * for one-shot completions instead.
   *
   * @param prompt - Text prompt
   * @param options - Optional generation options
   * @returns Empty async iterable (streaming not supported)
   */
  async *stream(prompt: string, options?: LLMOptions): AsyncIterable<string> {
    // Streaming not supported over IPC
    // Would require bidirectional communication (e.g., WebSocket, SSE)
    // For now, return empty iterable
    console.warn('[LLMProxy] stream() not supported over IPC. Use complete() instead.');
    return;
    // Make TypeScript happy - this is unreachable but ensures correct return type
    yield '';
  }
}

/**
 * Create an LLM proxy with IPC transport.
 *
 * @param transport - IPC transport to use
 * @returns LLM proxy instance
 *
 * @example
 * ```typescript
 * import { createLLMProxy, createIPCTransport } from '@kb-labs/core-runtime';
 *
 * const transport = createIPCTransport();
 * const llm = createLLMProxy(transport);
 * ```
 */
export function createLLMProxy(transport: ITransport): LLMProxy {
  return new LLMProxy(transport);
}
