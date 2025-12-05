/**
 * @module @kb-labs/core-platform/adapters/cache
 * Cache abstraction for key-value storage with TTL support.
 */

/**
 * Cache adapter interface.
 * Implementations: @kb-labs/core-redis (production), MemoryCache (noop)
 */
export interface ICache {
  /**
   * Get a value from cache.
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache.
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache.
   * @param key - Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Clear cache entries matching a pattern.
   * @param pattern - Glob pattern (e.g., 'user:*')
   */
  clear(pattern?: string): Promise<void>;
}
