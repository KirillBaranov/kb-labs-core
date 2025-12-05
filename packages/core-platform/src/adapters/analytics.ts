/**
 * @module @kb-labs/core-platform/adapters/analytics
 * Analytics abstraction for tracking events and user identification.
 */

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
}
