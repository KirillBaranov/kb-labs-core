/**
 * @module @kb-labs/core-platform/adapters/analytics
 * Analytics abstraction for tracking events and user identification.
 */

/**
 * Query parameters for fetching analytics events
 */
export interface EventsQuery {
  type?: string | string[];
  source?: string;
  actor?: string;
  from?: string; // ISO 8601 datetime
  to?: string; // ISO 8601 datetime
  limit?: number;
  offset?: number;
}

/**
 * Analytics event structure (matches kb.v1 schema from @kb-labs/analytics)
 */
export interface AnalyticsEvent {
  id: string;
  schema: 'kb.v1';
  type: string;
  ts: string;
  ingestTs: string;
  source: {
    product: string;
    version: string;
  };
  runId: string;
  actor?: {
    type: 'user' | 'agent' | 'ci';
    id?: string;
    name?: string;
  };
  ctx?: Record<string, string | number | boolean | null>;
  payload?: unknown;
  hashMeta?: {
    algo: 'hmac-sha256';
    saltId: string;
  };
}

/**
 * Response for events query
 */
export interface EventsResponse {
  events: AnalyticsEvent[];
  total: number;
  hasMore: boolean;
}

/**
 * Aggregated statistics across events
 */
export interface EventsStats {
  totalEvents: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  byActor: Record<string, number>;
  timeRange: {
    from: string;
    to: string;
  };
}

/**
 * Daily aggregated statistics for time-series visualization
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD format
  count: number;
  metrics?: Record<string, number>; // Optional metrics (e.g., totalTokens, totalCost, avgDurationMs)
}

/**
 * WAL buffer status (if applicable)
 */
export interface BufferStatus {
  segments: number;
  totalSizeBytes: number;
  oldestEventTs: string | null;
  newestEventTs: string | null;
}

/**
 * Dead-Letter Queue status (if applicable)
 */
export interface DlqStatus {
  failedEvents: number;
  oldestFailureTs: string | null;
}

/**
 * Context for analytics events (automatically populated).
 * Adapters use this to enrich events with source, actor, and runId.
 */
export interface AnalyticsContext {
  /**
   * Source of events (product name and version).
   * Automatically extracted from package.json.
   */
  source: {
    product: string;
    version: string;
  };

  /**
   * Run ID for correlating events in a single execution.
   * Automatically generated per-execution (e.g., CLI invocation, REST request).
   */
  runId: string;

  /**
   * Actor performing the action (user, agent, CI).
   * Auto-detected from environment (git config, CI env vars, etc).
   */
  actor?: {
    type: 'user' | 'agent' | 'ci';
    id?: string;
    name?: string;
  };

  /**
   * Tenant ID for multi-tenancy support.
   */
  tenantId?: string;

  /**
   * Additional context (workspace path, branch, etc).
   */
  ctx?: Record<string, string | number | boolean | null>;
}

/**
 * Analytics adapter interface.
 * Implementations: @kb-labs/analytics-adapter (production), NoOpAnalytics (noop)
 */
export interface IAnalytics {
  /**
   * Track an analytics event.
   * @param event - Event name (e.g., 'user.signup', 'workflow.completed')
   * @param properties - Optional event properties
   */
  track(event: string, properties?: Record<string, unknown>): Promise<void>;

  /**
   * Identify a user for analytics tracking.
   * @param userId - Unique user identifier
   * @param traits - Optional user traits (name, email, etc.)
   */
  identify(userId: string, traits?: Record<string, unknown>): Promise<void>;

  /**
   * Flush all pending analytics events.
   * Call before process exit to ensure all events are sent.
   */
  flush(): Promise<void>;

  /**
   * Get analytics events (optional - for reading/visualization).
   * Not implemented by NoOpAnalytics.
   */
  getEvents?(query?: EventsQuery): Promise<EventsResponse>;

  /**
   * Get aggregated statistics (optional - for dashboards).
   * Not implemented by NoOpAnalytics.
   */
  getStats?(): Promise<EventsStats>;

  /**
   * Get buffer status (optional - for monitoring).
   * Returns null if buffer not applicable (e.g., HTTP-only analytics).
   */
  getBufferStatus?(): Promise<BufferStatus | null>;

  /**
   * Get DLQ status (optional - for monitoring).
   * Returns null if DLQ not applicable.
   */
  getDlqStatus?(): Promise<DlqStatus | null>;

  /**
   * Get current source attribution (optional).
   *
   * Returns the current source (product name and version) used for events.
   * This is useful for saving and restoring source in nested plugin execution.
   *
   * @returns Current source, or undefined if not available
   *
   * Implementation notes:
   * - FileAnalytics: Returns current context.source
   * - NoOpAnalytics: Not needed (no events tracked)
   * - Future HTTP/Cloud adapters: Should implement this
   *
   * @example
   * ```typescript
   * const analytics = platform.analytics;
   * const originalSource = analytics.getSource?.();
   *
   * try {
   *   analytics.setSource?.({ product: '@kb-labs/mind', version: '0.1.0' });
   *   await analytics.track('mind.event', {...});
   * } finally {
   *   if (originalSource) {
   *     analytics.setSource?.(originalSource);
   *   }
   * }
   * ```
   */
  getSource?(): { product: string; version: string } | undefined;

  /**
   * Override source attribution for scoped execution (optional).
   *
   * This method allows wrapping analytics adapters to override the source
   * (product name and version) for events tracked during plugin execution.
   *
   * Use case: When a plugin (@kb-labs/mind) runs in a subprocess, we want
   * analytics events to show source.product = '@kb-labs/mind' instead of
   * the root package (@kb-labs/ai-review).
   *
   * @param source - New source to use for future events
   *
   * Implementation notes:
   * - FileAnalytics: Updates internal context.source
   * - NoOpAnalytics: Not needed (no events tracked)
   * - Future HTTP/Cloud adapters: Should implement this
   *
   * @example
   * ```typescript
   * const analytics = platform.analytics;
   * if (analytics.setSource) {
   *   analytics.setSource({
   *     product: '@kb-labs/mind',
   *     version: '0.1.0'
   *   });
   * }
   * await analytics.track('mind.rag-index.started', {...});
   * // Event will have source.product = '@kb-labs/mind'
   * ```
   */
  setSource?(source: { product: string; version: string }): void;

  /**
   * Get daily aggregated statistics (optional - for time-series visualization).
   *
   * Groups events by day (date only, no time) and returns aggregated counts
   * and metrics for each day. Useful for rendering charts and graphs.
   *
   * @param query - Event query with type, from/to filters
   * @returns Array of daily statistics sorted by date ascending
   *
   * Implementation notes:
   * - FileAnalytics: Groups events in memory using date-fns
   * - PostgresAnalytics: Uses SQL GROUP BY DATE(ts) for efficiency
   * - NoOpAnalytics: Not implemented (returns empty array)
   *
   * The metrics object contains aggregated values specific to the event type:
   * - LLM events: totalTokens, totalCost, avgDurationMs
   * - Embeddings events: totalTokens, totalCost, avgDurationMs
   * - VectorStore events: totalSearches, totalUpserts, totalDeletes, avgDurationMs
   * - Cache events: totalHits, totalMisses, totalSets, hitRate
   * - Storage events: totalBytesRead, totalBytesWritten, avgDurationMs
   *
   * @example
   * ```typescript
   * const stats = await analytics.getDailyStats?.({
   *   type: 'llm.completion.completed',
   *   from: '2026-01-01T00:00:00Z',
   *   to: '2026-01-31T23:59:59Z'
   * });
   *
   * // stats = [
   * //   { date: '2026-01-01', count: 45, metrics: { totalTokens: 12500, totalCost: 2.34 } },
   * //   { date: '2026-01-02', count: 52, metrics: { totalTokens: 14200, totalCost: 2.89 } },
   * //   ...
   * // ]
   * ```
   */
  getDailyStats?(query?: EventsQuery): Promise<DailyStats[]>;
}
