/**
 * @module @kb-labs/core/profiles/manifest/normalize
 * Profile manifest normalization and migration utilities
 */

import type { ProfileManifest, ProfileInfo } from '../types/types';

/**
 * Normalize profile manifest to new format
 * Supports both old and new manifest formats
 */
export function normalizeManifest(rawProfile: any): ProfileManifest {
  // Check if already in new format
  if (rawProfile.schemaVersion === '1.0') {
    return rawProfile as ProfileManifest;
  }

  // Migrate from old format
  console.warn('⚠️  Using legacy profile format. Please update to schemaVersion: "1.0"');
  
  const manifest: ProfileManifest = {
    $schema: 'https://schemas.kb-labs.dev/profile/profile.schema.json',
    schemaVersion: '1.0',
    name: rawProfile.name || 'unknown',
    version: rawProfile.version || '1.0.0',
    extends: rawProfile.extends || [],
    overrides: rawProfile.overrides || [],
    exports: normalizeExports(rawProfile.products || {}),
    defaults: normalizeDefaults(rawProfile.products || {}),
    discovery: rawProfile.discovery || {},
    metadata: rawProfile.metadata || {},
  };

  return manifest;
}

/**
 * Normalize exports from old products format to new exports format
 */
function normalizeExports(products: any): Record<string, Record<string, string | string[]>> {
  const exports: Record<string, Record<string, string | string[]>> = {};
  
  for (const [product, config] of Object.entries(products)) {
    if (typeof config === 'object' && config !== null) {
      const productExports: Record<string, string | string[]> = {};
      const configObj = config as any;
      
      // Map old product config to new exports format
      if (configObj.config) {
        productExports.config = configObj.config;
      }
      if (configObj.rules) {
        productExports.rules = configObj.rules;
      }
      if (configObj.templates) {
        productExports.templates = configObj.templates;
      }
      if (configObj.prompts) {
        productExports.prompts = configObj.prompts;
      }
      
      if (Object.keys(productExports).length > 0) {
        exports[product] = productExports;
      }
    }
  }
  
  return exports;
}

/**
 * Normalize defaults from old products format to new defaults format
 */
function normalizeDefaults(products: any): Record<string, { $ref: string }> {
  const defaults: Record<string, { $ref: string }> = {};
  
  for (const [product, config] of Object.entries(products)) {
    if (typeof config === 'object' && config !== null) {
      const configObj = config as any;
      if (configObj.defaults) {
        defaults[product] = { $ref: configObj.defaults };
      }
    }
  }
  
  return defaults;
}

/**
 * Extract ProfileInfo from normalized manifest
 */
export function extractProfileInfo(manifest: ProfileManifest, manifestPath: string): ProfileInfo {
  return {
    name: manifest.name,
    version: manifest.version,
    manifestPath,
    exports: manifest.exports,
    extends: manifest.extends,
    overlays: manifest.overrides,
  };
}

/**
 * Normalize product keys to kebab-case for consistency
 */
export function normalizeProductKeys(exports: Record<string, Record<string, string | string[]>>): Record<string, Record<string, string | string[]>> {
  const normalized: Record<string, Record<string, string | string[]>> = {};
  
  for (const [product, productExports] of Object.entries(exports)) {
    const kebabProduct = toKebabCase(product);
    normalized[kebabProduct] = productExports;
  }
  
  return normalized;
}

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}
