/**
 * @module @kb-labs/core-platform/noop/adapters/cache
 * In-memory cache implementation.
 */

import type { ICache } from '../../adapters/cache.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * In-memory cache with TTL support.
 * Useful for testing and local development.
 */
export class MemoryCache implements ICache {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.store.clear();
      return;
    }

    // Simple glob pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get the current number of entries (for testing).
   */
  get size(): number {
    return this.store.size;
  }
}
