/**
 * @module @kb-labs/core-runtime/proxy
 * IPC proxy for IVectorStore adapter.
 *
 * This proxy forwards all vector store operations to the parent process
 * via IPC. The parent process owns the real QdrantVectorStore instance.
 *
 * Benefits:
 * - Single QdrantVectorStore instance (shared across all sandbox workers)
 * - Reduced memory usage (no duplicate connections)
 * - Reduced connection count (5 instead of 250 for 50 workers)
 *
 * @example
 * ```typescript
 * import { VectorStoreProxy, createIPCTransport } from '@kb-labs/core-runtime';
 *
 * // In child process (sandbox worker)
 * const transport = createIPCTransport();
 * const vectorStore = new VectorStoreProxy(transport);
 *
 * // Use like normal IVectorStore
 * const results = await vectorStore.search([0.1, 0.2, 0.3], 10);
 * ```
 */

import type {
  IVectorStore,
  VectorRecord,
  VectorSearchResult,
  VectorFilter,
} from '@kb-labs/core-platform';
import type { ITransport } from '../transport/transport';
import { RemoteAdapter } from './remote-adapter';

/**
 * IPC proxy for IVectorStore adapter.
 *
 * All method calls are forwarded to the parent process via IPC.
 * The parent process executes the call on the real vector store
 * (e.g., QdrantVectorStore) and returns the result.
 *
 * From the caller's perspective, this behaves identically to a
 * local vector store - the IPC layer is completely transparent.
 */
export class VectorStoreProxy extends RemoteAdapter<IVectorStore> implements IVectorStore {
  /**
   * Create a vector store proxy.
   *
   * @param transport - IPC transport to communicate with parent
   */
  constructor(transport: ITransport) {
    super('vectorStore', transport);
  }

  /**
   * Search for similar vectors.
   *
   * @param query - Query embedding vector
   * @param limit - Maximum number of results
   * @param filter - Optional metadata filter
   * @returns Promise resolving to search results
   */
  async search(
    query: number[],
    limit: number,
    filter?: VectorFilter
  ): Promise<VectorSearchResult[]> {
    return (await this.callRemote('search', [query, limit, filter])) as VectorSearchResult[];
  }

  /**
   * Insert or update vectors.
   *
   * @param vectors - Vector records to upsert
   */
  async upsert(vectors: VectorRecord[]): Promise<void> {
    await this.callRemote('upsert', [vectors]);
  }

  /**
   * Delete vectors by IDs.
   *
   * @param ids - Vector IDs to delete
   */
  async delete(ids: string[]): Promise<void> {
    await this.callRemote('delete', [ids]);
  }

  /**
   * Count total vectors in collection.
   *
   * @returns Promise resolving to vector count
   */
  async count(): Promise<number> {
    return (await this.callRemote('count', [])) as number;
  }

  /**
   * Get vectors by IDs.
   *
   * @param ids - Vector IDs to retrieve
   * @returns Promise resolving to vector records
   */
  async get(ids: string[]): Promise<VectorRecord[]> {
    return (await this.callRemote('get', [ids])) as VectorRecord[];
  }

  /**
   * Clear all vectors from collection.
   */
  async clear(): Promise<void> {
    await this.callRemote('clear', []);
  }

  /**
   * Initialize the vector store.
   * Called during platform initialization.
   */
  async initialize(): Promise<void> {
    await this.callRemote('initialize', []);
  }

  /**
   * Close connections and cleanup resources.
   */
  async close(): Promise<void> {
    await this.callRemote('close', []);
  }
}

/**
 * Create a VectorStore proxy with IPC transport.
 *
 * @param transport - IPC transport to use
 * @returns VectorStore proxy instance
 *
 * @example
 * ```typescript
 * import { createVectorStoreProxy, createIPCTransport } from '@kb-labs/core-runtime';
 *
 * const transport = createIPCTransport();
 * const vectorStore = createVectorStoreProxy(transport);
 * ```
 */
export function createVectorStoreProxy(transport: ITransport): VectorStoreProxy {
  return new VectorStoreProxy(transport);
}
