/**
 * @module @kb-labs/core-platform/wrappers/analytics-cache
 * Analytics wrapper for ICache that tracks usage
 */

import type { ICache } from '../adapters/cache.js';
import type { IAnalytics } from '../adapters/analytics.js';

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `cache_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Analytics wrapper for cache adapter.
 * Tracks all cache operations including hit/miss rates.
 */
export class AnalyticsCache implements ICache {
  constructor(
    private realCache: ICache,
    private analytics: IAnalytics
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      const result = await this.realCache.get<T>(key);
      const durationMs = Date.now() - startTime;
      const hit = result !== null;

      // Track hit or miss
      await this.analytics.track(hit ? 'cache.get.hit' : 'cache.get.miss', {
        requestId,
        key,
        durationMs,
      });

      return result;
    } catch (error) {
      await this.analytics.track('cache.get.error', {
        requestId,
        key,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      await this.realCache.set(key, value, ttl);
      const durationMs = Date.now() - startTime;

      // Track set operation
      await this.analytics.track('cache.set.completed', {
        requestId,
        key,
        ttl: ttl ?? null,
        durationMs,
      });
    } catch (error) {
      await this.analytics.track('cache.set.error', {
        requestId,
        key,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      await this.realCache.delete(key);
      const durationMs = Date.now() - startTime;

      // Track delete operation
      await this.analytics.track('cache.delete.completed', {
        requestId,
        key,
        durationMs,
      });
    } catch (error) {
      await this.analytics.track('cache.delete.error', {
        requestId,
        key,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async clear(pattern?: string): Promise<void> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      await this.realCache.clear(pattern);
      const durationMs = Date.now() - startTime;

      // Track clear operation
      await this.analytics.track('cache.clear.completed', {
        requestId,
        pattern: pattern ?? null,
        durationMs,
      });
    } catch (error) {
      await this.analytics.track('cache.clear.error', {
        requestId,
        pattern: pattern ?? null,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      await this.realCache.zadd(key, score, member);
      const durationMs = Date.now() - startTime;

      await this.analytics.track('cache.zadd.completed', {
        requestId,
        key,
        durationMs,
      });
    } catch (error) {
      await this.analytics.track('cache.zadd.error', {
        requestId,
        key,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      const results = await this.realCache.zrangebyscore(key, min, max);
      const durationMs = Date.now() - startTime;

      await this.analytics.track('cache.zrangebyscore.completed', {
        requestId,
        key,
        resultsCount: results.length,
        durationMs,
      });

      return results;
    } catch (error) {
      await this.analytics.track('cache.zrangebyscore.error', {
        requestId,
        key,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async zrem(key: string, member: string): Promise<void> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      await this.realCache.zrem(key, member);
      const durationMs = Date.now() - startTime;

      await this.analytics.track('cache.zrem.completed', {
        requestId,
        key,
        durationMs,
      });
    } catch (error) {
      await this.analytics.track('cache.zrem.error', {
        requestId,
        key,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async setIfNotExists<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      const result = await this.realCache.setIfNotExists(key, value, ttl);
      const durationMs = Date.now() - startTime;

      await this.analytics.track('cache.setIfNotExists.completed', {
        requestId,
        key,
        success: result,
        ttl: ttl ?? null,
        durationMs,
      });

      return result;
    } catch (error) {
      await this.analytics.track('cache.setIfNotExists.error', {
        requestId,
        key,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }
}
