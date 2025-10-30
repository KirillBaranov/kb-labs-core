/**
 * @module @kb-labs/core/config/utils/product-normalize
 * Product ID normalization between code (camelCase) and filesystem (kebab-case)
 */
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
export function toFsProduct(id) {
    return FS_MAP.get(id) ?? id;
}
/**
 * Convert filesystem kebab-case key to ProductId
 * @param fsKey kebab-case string from filesystem
 * @returns ProductId in camelCase
 */
export function toConfigProduct(fsKey) {
    for (const [k, v] of FS_MAP) {
        if (v === fsKey) {
            return k;
        }
    }
    return fsKey;
}
/**
 * Check if a string is a valid ProductId
 */
export function isValidProductId(value) {
    return FS_MAP.has(value);
}
/**
 * Get all valid ProductId values
 */
export function getAllProductIds() {
    return Array.from(FS_MAP.keys());
}
//# sourceMappingURL=product-normalize.js.map