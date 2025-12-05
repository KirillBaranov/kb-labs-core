/**
 * @module @kb-labs/core-platform/adapters/storage
 * Storage abstraction for file/blob operations.
 */

/**
 * Storage adapter interface.
 * Implementations: @kb-labs/core-fs (production), MemoryStorage (noop)
 */
export interface IStorage {
  /**
   * Read file contents.
   * @param path - File path
   * @returns File contents or null if not found
   */
  read(path: string): Promise<Buffer | null>;

  /**
   * Write file contents.
   * @param path - File path
   * @param data - File contents
   */
  write(path: string, data: Buffer): Promise<void>;

  /**
   * Delete a file.
   * @param path - File path
   */
  delete(path: string): Promise<void>;

  /**
   * List files matching a prefix.
   * @param prefix - Path prefix (e.g., 'docs/')
   * @returns Array of file paths
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Check if a file exists.
   * @param path - File path
   */
  exists(path: string): Promise<boolean>;
}
