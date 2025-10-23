/**
 * @module @kb-labs/core/config/utils/product-normalize
 * Product ID normalization between code (camelCase) and filesystem (kebab-case)
 */

import type { ProductId } from '../types/types';

const FS_MAP = new Map([
  ['aiReview', 'ai-review'],
  ['aiDocs', 'ai-docs'],
  ['devlink', 'devlink'],
  ['release', 'release'],
  ['devkit', 'devkit'],
]);

/**
 * Convert ProductId to filesystem kebab-case format
 * @param id ProductId in camelCase
 * @returns kebab-case string for filesystem paths
 */
export function toFsProduct(id: ProductId): string {
  return FS_MAP.get(id) ?? id;
}

/**
 * Convert filesystem kebab-case key to ProductId
 * @param fsKey kebab-case string from filesystem
 * @returns ProductId in camelCase
 */
export function toConfigProduct(fsKey: string): ProductId {
  for (const [k, v] of FS_MAP) {
    if (v === fsKey) return k as ProductId;
  }
  return fsKey as ProductId;
}

/**
 * Check if a string is a valid ProductId
 */
export function isValidProductId(value: string): value is ProductId {
  return FS_MAP.has(value as ProductId);
}

/**
 * Get all valid ProductId values
 */
export function getAllProductIds(): ProductId[] {
  return Array.from(FS_MAP.keys()) as ProductId[];
}
