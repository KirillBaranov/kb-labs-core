/**
 * @module @kb-labs/core/profiles/defaults/product-defaults
 * Product defaults resolution via $ref
 */

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import type { ProfileInfo } from '../types/types';
import { KbError, ERROR_HINTS } from '@kb-labs/core-config';

/**
 * Get product defaults from profile
 */
export async function getProductDefaults<T>(
  profile: ProfileInfo,
  product: string,
  schema: any
): Promise<T> {
  const defaults = profile.exports[product]?.defaults;
  if (!defaults) {
    return {} as T;
  }
  
  const profileRoot = path.dirname(profile.manifestPath);
  const defaultsRef = Array.isArray(defaults) ? defaults[0] : defaults;
  if (!defaultsRef) {
    return {} as T;
  }
  const defaultsPath = path.join(profileRoot, defaultsRef);
  
  // Security check: ensure path is within profile root
  if (!defaultsPath.startsWith(profileRoot)) {
    throw new KbError(
      'ERR_DEFAULTS_PATH_ESCAPE',
      `Defaults path escapes profile root: ${defaults}`,
      'Defaults paths must be within the profile directory',
      { defaults, profileRoot }
    );
  }
  
  try {
    const defaultsData = await fsp.readFile(defaultsPath, 'utf-8');
    const parsed = JSON.parse(defaultsData);
    
    // Validate against schema if provided
    if (schema) {
      // Schema validation will be implemented with AJV
      // For now, we'll skip validation
    }
    
    return parsed as T;
  } catch (error) {
    throw new KbError(
      'ERR_DEFAULTS_READ_FAILED',
      `Failed to read defaults: ${defaults}`,
      ERROR_HINTS.ERR_PROFILE_RESOLVE_FAILED,
      { defaults, error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Resolve $ref in defaults
 */
export async function resolveDefaultsRef(
  profile: ProfileInfo,
  ref: string
): Promise<any> {
  if (!ref.startsWith('./')) {
    throw new KbError(
      'ERR_DEFAULTS_REF_INVALID',
      `Invalid defaults reference: ${ref}`,
      'References must be relative paths starting with ./',
      { ref }
    );
  }
  
  const profileRoot = path.dirname(profile.manifestPath);
  const refPath = path.join(profileRoot, ref);
  
  // Security check: ensure path is within profile root
  if (!refPath.startsWith(profileRoot)) {
    throw new KbError(
      'ERR_DEFAULTS_REF_ESCAPE',
      `Defaults reference escapes profile root: ${ref}`,
      'References must be within the profile directory',
      { ref, profileRoot }
    );
  }
  
  try {
    const refData = await fsp.readFile(refPath, 'utf-8');
    return JSON.parse(refData);
  } catch (error) {
    throw new KbError(
      'ERR_DEFAULTS_REF_READ_FAILED',
      `Failed to read defaults reference: ${ref}`,
      ERROR_HINTS.ERR_PROFILE_RESOLVE_FAILED,
      { ref, error: error instanceof Error ? error.message : String(error) }
    );
  }
}
