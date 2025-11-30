/**
 * @module @kb-labs/core/profiles/cache/artifact-cache
 * LRU cache for artifact metadata with clearCaches() support
 */

import type { ArtifactMetadata } from '../types/types';

interface CacheEntry {
  metadata: ArtifactMetadata;
  timestamp: number;
}

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

class ArtifactCache {
  private cache = new LRUCache<string, CacheEntry>(100);
  private mimeCache = new LRUCache<string, string>(50);

  /**
   * Get cached artifact metadata
   */
  get(profilePath: string, relPath: string): ArtifactMetadata | null {
    const key = `${profilePath}:${relPath}`;
    const entry = this.cache.get(key);
    return entry?.metadata || null;
  }

  /**
   * Cache artifact metadata
   */
  set(profilePath: string, relPath: string, metadata: ArtifactMetadata): void {
    const key = `${profilePath}:${relPath}`;
    this.cache.set(key, {
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached MIME type
   */
  getMimeType(filePath: string): string | null {
    return this.mimeCache.get(filePath) || null;
  }

  /**
   * Cache MIME type
   */
  setMimeType(filePath: string, mimeType: string): void {
    this.mimeCache.set(filePath, mimeType);
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.cache.clear();
    this.mimeCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; mimeSize: number } {
    return {
      size: this.cache.size(),
      mimeSize: this.mimeCache.size(),
    };
  }
}

// Singleton instance
const artifactCache = new ArtifactCache();

export { artifactCache, ArtifactCache };

/**
 * Clear all artifact caches
 */
export function clearCaches(): void {
  artifactCache.clearCaches();
}
