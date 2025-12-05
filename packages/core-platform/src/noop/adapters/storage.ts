/**
 * @module @kb-labs/core-platform/noop/adapters/storage
 * In-memory storage implementation.
 */

import type { IStorage } from '../../adapters/storage.js';

/**
 * In-memory storage for testing and local development.
 * Data is lost when the process exits.
 */
export class MemoryStorage implements IStorage {
  private store = new Map<string, Buffer>();

  async read(path: string): Promise<Buffer | null> {
    return this.store.get(path) ?? null;
  }

  async write(path: string, data: Buffer): Promise<void> {
    this.store.set(path, data);
  }

  async delete(path: string): Promise<void> {
    this.store.delete(path);
  }

  async list(prefix: string): Promise<string[]> {
    const results: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        results.push(key);
      }
    }
    return results.sort();
  }

  async exists(path: string): Promise<boolean> {
    return this.store.has(path);
  }

  /**
   * Get the current number of stored files (for testing).
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Clear all storage (for testing).
   */
  clear(): void {
    this.store.clear();
  }
}
