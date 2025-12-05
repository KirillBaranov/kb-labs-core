/**
 * @module @kb-labs/core-platform/adapters/vector-store
 * Vector store abstraction for semantic search operations.
 */

/**
 * Vector record for storage.
 */
export interface VectorRecord {
  /** Unique identifier */
  id: string;
  /** Embedding vector */
  vector: number[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Search result from vector store.
 */
export interface VectorSearchResult {
  /** Record identifier */
  id: string;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
  /** Record metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Filter for vector search.
 */
export interface VectorFilter {
  /** Field name to filter on */
  field: string;
  /** Filter operator */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  /** Filter value */
  value: unknown;
}

/**
 * Vector store adapter interface.
 * Implementations: @kb-labs/mind-qdrant (production), MemoryVectorStore (noop)
 */
export interface IVectorStore {
  /**
   * Search for similar vectors.
   * @param query - Query embedding vector
   * @param limit - Maximum number of results
   * @param filter - Optional metadata filter
   */
  search(query: number[], limit: number, filter?: VectorFilter): Promise<VectorSearchResult[]>;

  /**
   * Upsert vectors into the store.
   * @param vectors - Array of vector records to upsert
   */
  upsert(vectors: VectorRecord[]): Promise<void>;

  /**
   * Delete vectors by IDs.
   * @param ids - Array of vector IDs to delete
   */
  delete(ids: string[]): Promise<void>;

  /**
   * Get total count of vectors in the store.
   */
  count(): Promise<number>;
}
