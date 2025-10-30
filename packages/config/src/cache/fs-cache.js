/**
 * @module @kb-labs/core/config/cache/fs-cache
 * LRU cache for filesystem reads with clearCaches() support
 */
import { promises as fsp } from 'node:fs';
class LRUCache {
    cache = new Map();
    maxSize;
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
    }
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
class FSCache {
    cache = new LRUCache(100);
    keyCache = new LRUCache(100);
    /**
     * Generate cache key from file path, mtime, and size
     */
    async getCacheKey(absPath) {
        const keyStr = `key:${absPath}`;
        let key = this.keyCache.get(keyStr);
        if (!key) {
            try {
                const stats = await fsp.stat(absPath);
                key = {
                    absPath,
                    mtime: stats.mtime.getTime(),
                    size: stats.size,
                };
                this.keyCache.set(keyStr, key);
            }
            catch {
                // File doesn't exist or can't be read
                return { absPath, mtime: 0, size: 0 };
            }
        }
        return key;
    }
    /**
     * Get cached file data if available and not stale
     */
    async get(absPath) {
        const key = await this.getCacheKey(absPath);
        const cacheKey = `${key.absPath}|${key.mtime}|${key.size}`;
        const entry = this.cache.get(cacheKey);
        if (!entry) {
            return null;
        }
        // Check if file has been modified since cache
        try {
            const stats = await fsp.stat(absPath);
            if (stats.mtime.getTime() !== key.mtime || stats.size !== key.size) {
                // File changed, remove from cache and update key cache
                this.cache.delete(cacheKey);
                // Update the key cache with new stats
                const newKey = {
                    absPath,
                    mtime: stats.mtime.getTime(),
                    size: stats.size,
                };
                this.keyCache.set(`key:${absPath}`, newKey);
                return null;
            }
        }
        catch {
            // File no longer exists
            this.cache.delete(cacheKey);
            return null;
        }
        return entry.data;
    }
    /**
     * Cache file data
     */
    async set(absPath, data) {
        const key = await this.getCacheKey(absPath);
        const cacheKey = `${key.absPath}|${key.mtime}|${key.size}`;
        this.cache.set(cacheKey, {
            data,
            mtime: key.mtime,
            size: key.size,
            timestamp: Date.now(),
        });
    }
    /**
     * Clear all caches
     */
    clearCaches() {
        this.cache.clear();
        this.keyCache.clear();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size(),
            keySize: this.keyCache.size(),
        };
    }
}
// Singleton instance
const fsCache = new FSCache();
export { fsCache, FSCache };
/**
 * Clear all filesystem caches
 */
export function clearCaches() {
    fsCache.clearCaches();
}
//# sourceMappingURL=fs-cache.js.map