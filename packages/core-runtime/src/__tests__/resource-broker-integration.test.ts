/**
 * @module @kb-labs/core-runtime/__tests__/resource-broker-integration
 *
 * Real integration tests for ResourceBroker with actual adapters.
 * NO MOCKS - real rate limiting, real queuing, real timing.
 *
 * Tests:
 * - Real rate limiting enforcement (timing-based)
 * - Real retry logic with backoff
 * - Real timeout behavior
 * - Real queue under load
 * - Real concurrent execution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceBroker, InMemoryRateLimitBackend, createQueuedLLM, createQueuedEmbeddings } from '@kb-labs/core-resource-broker';
import type { ILLM, IEmbeddings } from '@kb-labs/core-platform';

describe('ResourceBroker Integration (Real)', () => {
  let broker: ResourceBroker;

  beforeEach(() => {
    // Create real ResourceBroker with in-memory backend
    const backend = new InMemoryRateLimitBackend();
    broker = new ResourceBroker(backend);
  });

  describe('Rate Limiting - Real Timing', () => {
    it('should enforce 1 request per second rate limit', async () => {
      // Real LLM adapter with timing tracking
      const callTimes: number[] = [];
      const mockLLM: ILLM = {
        complete: async (prompt: string) => {
          callTimes.push(Date.now());
          return { content: `Response: ${prompt}`, model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 } };
        },
      };

      // Register resource with 2 RPS (with safetyMargin 0.9 → 1.8 → floor to 1 per second)
      broker.register('llm', {
        rateLimits: { requestsPerSecond: 2 },
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      // Wrap adapter
      const queuedLLM = createQueuedLLM(broker, mockLLM);

      // Make 3 rapid calls
      const start = Date.now();
      await Promise.all([
        queuedLLM.complete('prompt 1'),
        queuedLLM.complete('prompt 2'),
        queuedLLM.complete('prompt 3'),
      ]);
      const duration = Date.now() - start;

      // Verify timing
      expect(callTimes).toHaveLength(3);

      // Should take ~2 seconds (first immediate, then 1s, then 2s)
      expect(duration).toBeGreaterThanOrEqual(1900); // Allow 100ms margin
      expect(duration).toBeLessThan(2500);

      // Verify calls were spaced ~1 second apart
      const gap1 = callTimes[1] - callTimes[0];
      const gap2 = callTimes[2] - callTimes[1];

      expect(gap1).toBeGreaterThanOrEqual(900);
      expect(gap1).toBeLessThan(1200);
      expect(gap2).toBeGreaterThanOrEqual(900);
      expect(gap2).toBeLessThan(1200);
    }, 10000);

    it('should allow burst of requests within high rate limit', async () => {
      const mockLLM: ILLM = {
        complete: async (prompt: string) => ({
          content: `Response: ${prompt}`,
          model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 },
        }),
        async *stream() { yield 'mock stream'; },
      };

      // High rate limit (600 RPM = 10 per second)
      broker.register('llm', {
        rateLimits: { requestsPerMinute: 600 },
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      const start = Date.now();

      // 5 calls should complete quickly
      await Promise.all([
        queuedLLM.complete('1'),
        queuedLLM.complete('2'),
        queuedLLM.complete('3'),
        queuedLLM.complete('4'),
        queuedLLM.complete('5'),
      ]);

      const duration = Date.now() - start;

      // Should be fast (under 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle 10 requests with 2 req/sec limit', async () => {
      const callTimes: number[] = [];
      const mockLLM: ILLM = {
        complete: async (prompt: string) => {
          callTimes.push(Date.now());
          return { content: prompt, model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 } };
        },
      };

      // 3 RPS with safetyMargin 0.9 → 2.7 → floor to 2 per second
      broker.register('llm', {
        rateLimits: { requestsPerSecond: 3 },
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      const start = Date.now();

      // 10 calls with 2 req/sec = should take ~4.5 seconds
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => queuedLLM.complete(`prompt ${i}`))
      );

      const duration = Date.now() - start;

      expect(callTimes).toHaveLength(10);

      // Should take 4-5 seconds (10 calls / 2 per sec = 5s, but first 2 are immediate)
      expect(duration).toBeGreaterThanOrEqual(4000);
      expect(duration).toBeLessThan(5500);
    }, 10000);
  });

  describe('Retry Logic - Real Failures', () => {
    it('should retry 3 times before succeeding', async () => {
      let attemptCount = 0;
      const attemptTimes: number[] = [];

      const mockLLM: ILLM = {
        complete: async () => {
          attemptCount++;
          attemptTimes.push(Date.now());

          if (attemptCount < 3) {
            // Throw a server error (retryable)
            const error: any = new Error(`Server error: Attempt ${attemptCount} failed`);
            error.status = 500;
            throw error;
          }

          return { content: 'Success on attempt 3', model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 } };
        },
      };

      broker.register('llm', {
        rateLimits: { requestsPerMinute: 600 }, // High limit for fast test
        maxRetries: 3,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      const result = await queuedLLM.complete('test');

      // Should succeed after 3 attempts
      expect(attemptCount).toBe(3);
      expect(result.content).toBe('Success on attempt 3');
      expect(attemptTimes).toHaveLength(3);
    }, 10000);

    it('should fail after max retries exceeded', async () => {
      let attemptCount = 0;

      const mockLLM: ILLM = {
        complete: async () => {
          attemptCount++;
          // Throw a server error (retryable)
          const error: any = new Error('Persistent server failure');
          error.status = 503;
          throw error;
        },
        async *stream() { yield 'mock stream'; },
      };

      broker.register('llm', {
        rateLimits: { requestsPerMinute: 600 },
        maxRetries: 2,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      await expect(queuedLLM.complete('test')).rejects.toThrow('Persistent server failure');

      // Should try 3 times (initial + 2 retries)
      expect(attemptCount).toBe(3);
    }, 10000);
  });

  describe('Timeout - Real Delays', () => {
    it('should timeout after 500ms', async () => {
      const mockLLM: ILLM = {
        complete: async () => {
          // Simulate slow operation (2 seconds)
          await new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
          return { content: 'Too late', model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 } };
        },
      };

      broker.register('llm', {
        rateLimits: { requestsPerMinute: 600 },
        maxRetries: 0,
        timeout: 500, // 500ms timeout
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      const start = Date.now();

      await expect(queuedLLM.complete('test')).rejects.toThrow();

      const duration = Date.now() - start;

      // Should fail around 500ms (not wait full 2 seconds)
      expect(duration).toBeGreaterThanOrEqual(450);
      expect(duration).toBeLessThan(1000);
    }, 10000);

    it('should succeed if completes before timeout', async () => {
      const mockLLM: ILLM = {
        complete: async () => {
          // Fast operation (100ms)
          await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
          return { content: 'Fast response', model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 } };
        },
      };

      broker.register('llm', {
        rateLimits: { requestsPerMinute: 600 },
        maxRetries: 0,
        timeout: 1000, // 1 second timeout
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      const result = await queuedLLM.complete('test');

      expect(result.content).toBe('Fast response');
    });
  });

  describe('Queue Under Load - Real Concurrency', () => {
    it('should handle 20 concurrent requests with 3 req/sec limit', async () => {
      const callTimes: number[] = [];
      const mockLLM: ILLM = {
        complete: async (prompt: string) => {
          callTimes.push(Date.now());
          return { content: prompt, model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 } };
        },
      };

      // 4 RPS with safetyMargin 0.9 → 3.6 → floor to 3 per second
      broker.register('llm', {
        rateLimits: { requestsPerSecond: 4 },
        maxRetries: 0,
        timeout: 15000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      const start = Date.now();

      // 20 requests with 3 req/sec
      await Promise.all(
        Array.from({ length: 20 }, (_, i) => queuedLLM.complete(`request ${i}`))
      );

      const duration = Date.now() - start;

      expect(callTimes).toHaveLength(20);

      // 20 requests / 3 per sec = ~6.67 seconds
      expect(duration).toBeGreaterThanOrEqual(6000);
      expect(duration).toBeLessThan(7500);
    }, 15000);

    it('should track concurrent executions', async () => {
      let currentConcurrent = 0;
      let maxConcurrent = 0;

      const mockEmbeddings: IEmbeddings = {
        embed: async (text: string) => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

          // Simulate work
          await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });

          currentConcurrent--;
          return [0.1, 0.2, 0.3];
        },
        embedBatch: async () => [],
        dimensions: 3,
      };

      broker.register('embeddings', {
        rateLimits: { requestsPerMinute: 600 }, // High limit
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'embed') {
            return mockEmbeddings.embed(args[0] as string);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedEmbeddings = createQueuedEmbeddings(broker, mockEmbeddings);

      // 15 concurrent requests
      await Promise.all(
        Array.from({ length: 15 }, (_, i) => queuedEmbeddings.embed(`text ${i}`))
      );

      // Should have had multiple concurrent executions
      expect(maxConcurrent).toBeGreaterThan(1);
      expect(maxConcurrent).toBeLessThanOrEqual(15);
    }, 10000);
  });

  describe('Mixed Operations - Real Scenario', () => {
    it('should handle LLM and embeddings simultaneously', async () => {
      const llmCalls: number[] = [];
      const embeddingCalls: number[] = [];

      const mockLLM: ILLM = {
        complete: async (prompt: string) => {
          llmCalls.push(Date.now());
          await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
          return { content: prompt, model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 } };
        },
      };

      const mockEmbeddings: IEmbeddings = {
        embed: async (text: string) => {
          embeddingCalls.push(Date.now());
          await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
          return [0.1, 0.2, 0.3];
        },
        embedBatch: async () => [],
        dimensions: 3,
      };

      // Different rate limits
      broker.register('llm', {
        rateLimits: { requestsPerMinute: 120 }, // 2 per sec
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      broker.register('embeddings', {
        rateLimits: { requestsPerMinute: 300 }, // 5 per sec
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'embed') {
            return mockEmbeddings.embed(args[0] as string);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);
      const queuedEmbeddings = createQueuedEmbeddings(broker, mockEmbeddings);

      const start = Date.now();

      // Mix of operations
      await Promise.all([
        queuedLLM.complete('prompt 1'),
        queuedLLM.complete('prompt 2'),
        queuedLLM.complete('prompt 3'),
        queuedEmbeddings.embed('text 1'),
        queuedEmbeddings.embed('text 2'),
        queuedEmbeddings.embed('text 3'),
        queuedEmbeddings.embed('text 4'),
        queuedEmbeddings.embed('text 5'),
      ]);

      const duration = Date.now() - start;

      expect(llmCalls).toHaveLength(3);
      expect(embeddingCalls).toHaveLength(5);

      // Should complete faster than if sequential
      expect(duration).toBeLessThan(3000);
    }, 10000);
  });

  describe('Edge Cases - Real Behavior', () => {
    it('should handle zero-delay for unlimited rate', async () => {
      const mockLLM: ILLM = {
        complete: async (prompt: string) => ({
          content: prompt,
          model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 },
        }),
        async *stream() { yield 'mock stream'; },
      };

      // Very high limit (effectively unlimited)
      broker.register('llm', {
        rateLimits: { requestsPerMinute: 100000 },
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      const start = Date.now();

      // 20 rapid calls
      await Promise.all(
        Array.from({ length: 20 }, (_, i) => queuedLLM.complete(`prompt ${i}`))
      );

      const duration = Date.now() - start;

      // Should be very fast
      expect(duration).toBeLessThan(500);
    });

    it('should handle adapter throwing synchronous error', async () => {
      const mockLLM: ILLM = {
        complete: async () => {
          throw new Error('Sync error');
        },
        async *stream() { yield 'mock stream'; },
      };

      broker.register('llm', {
        rateLimits: { requestsPerMinute: 600 },
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      await expect(queuedLLM.complete('test')).rejects.toThrow('Sync error');
    });

    it('should preserve adapter interface with options', async () => {
      const mockLLM: ILLM = {
        complete: async (prompt: string, options?: any) => ({
          content: `${prompt} temp=${options?.temperature ?? 'none'}`,
          model: "mock-llm", usage: { promptTokens: 10, completionTokens: 5 },
        }),
        async *stream() { yield 'mock stream'; },
      };

      broker.register('llm', {
        rateLimits: { requestsPerMinute: 600 },
        maxRetries: 0,
        timeout: 10000,
        executor: async (op, args) => {
          if (op === 'complete') {
            return mockLLM.complete(args[0] as string, args[1]);
          }
          throw new Error(`Unknown op: ${op}`);
        },
      });

      const queuedLLM = createQueuedLLM(broker, mockLLM);

      const result = await queuedLLM.complete('test', { temperature: 0.7 });

      expect(result.content).toBe('test temp=0.7');
    });
  });
});
