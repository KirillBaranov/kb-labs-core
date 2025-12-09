/**
 * @module @kb-labs/core-runtime/proxy
 * IPC proxy for ICache adapter.
 *
 * This proxy forwards all cache operations to the parent process via IPC.
 * The parent process owns the real cache adapter (e.g., RedisCacheAdapter).
 *
 * Benefits:
 * - Single cache instance (shared across all sandbox workers)
 * - Reduced memory usage (no duplicate Redis connections)
 * - Reduced connection count (5 instead of 250 for 50 workers)
 *
 * @example
 * ```typescript
 * import { CacheProxy, createIPCTransport } from '@kb-labs/core-runtime';
 *
 * // In child process (sandbox worker)
 * const transport = createIPCTransport();
 * const cache = new CacheProxy(transport);
 *
 * // Use like normal ICache
 * await cache.set('key', { foo: 'bar' }, 60000);
 * const value = await cache.get('key');
 * ```
 */

import type { ICache } from '@kb-labs/core-platform';
import type { ITransport } from '../transport/transport';
import { RemoteAdapter } from './remote-adapter';

/**
 * IPC proxy for ICache adapter.
 *
 * All method calls are forwarded to the parent process via IPC.
 * The parent process executes the call on the real cache adapter
 * (e.g., RedisCacheAdapter) and returns the result.
 *
 * From the caller's perspective, this behaves identically to a
 * local cache - the IPC layer is completely transparent.
 */
export class CacheProxy extends RemoteAdapter<ICache> implements ICache {
  /**
   * Create a cache proxy.
   *
   * @param transport - IPC transport to communicate with parent
   */
  constructor(transport: ITransport) {
    super('cache', transport);
  }

  /**
   * Get a value from cache.
   *
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    return (await this.callRemote('get', [key])) as T | null;
  }

  /**
   * Set a value in cache.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.callRemote('set', [key, value, ttl]);
  }

  /**
   * Delete a value from cache.
   *
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    await this.callRemote('delete', [key]);
  }

  /**
   * Clear cache entries matching a pattern.
   *
   * @param pattern - Glob pattern (e.g., 'user:*')
   */
  async clear(pattern?: string): Promise<void> {
    await this.callRemote('clear', [pattern]);
  }
}

/**
 * Create a Cache proxy with IPC transport.
 *
 * @param transport - IPC transport to use
 * @returns Cache proxy instance
 *
 * @example
 * ```typescript
 * import { createCacheProxy, createIPCTransport } from '@kb-labs/core-runtime';
 *
 * const transport = createIPCTransport();
 * const cache = createCacheProxy(transport);
 * ```
 */
export function createCacheProxy(transport: ITransport): CacheProxy {
  return new CacheProxy(transport);
}
