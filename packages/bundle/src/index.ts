/**
 * @module @kb-labs/core-bundle
 * Facade package for KB Labs bundle system
 */

export * from './types/types';
export * from './api/load-bundle';
export * from './api/explain-bundle';

// Init system
export { initAll, type InitAllOptions, type InitAllResult } from './api/init-all';

// Re-export clearCaches for convenience
export { clearCaches } from './api/load-bundle';

// Re-export ProductId for CLI convenience
export type { ProductId } from '@kb-labs/core-config';
