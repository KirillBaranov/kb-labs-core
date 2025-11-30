/**
 * @module @kb-labs/core/profiles/resolver/extends-resolver
 * Profile extends resolution with cycle detection
 */

import type { ProfileInfo } from '../types/types';
import { KbError, ERROR_HINTS } from '@kb-labs/core-config';

const MAX_EXTENDS_DEPTH = 8;

/**
 * Resolve profile extends with cycle detection
 */
export async function resolveExtends(
  profile: ProfileInfo,
  loadProfile: (profileRef: string) => Promise<ProfileInfo>,
  visited: Set<string> = new Set(),
  depth: number = 0
): Promise<ProfileInfo[]> {
  // Check depth limit
  if (depth >= MAX_EXTENDS_DEPTH) {
    throw new KbError(
      'ERR_EXTENDS_DEPTH_EXCEEDED',
      `Profile extends depth exceeded: ${depth} >= ${MAX_EXTENDS_DEPTH}`,
      'Reduce the depth of profile extends or increase MAX_EXTENDS_DEPTH',
      { depth, limit: MAX_EXTENDS_DEPTH }
    );
  }
  
  // Check for cycles
  const profileKey = `${profile.name}@${profile.version}`;
  if (visited.has(profileKey)) {
    throw new KbError(
      'ERR_EXTENDS_CYCLE_DETECTED',
      `Circular dependency detected: ${profileKey}`,
      'Remove circular references in profile extends',
      { cycle: Array.from(visited), current: profileKey }
    );
  }
  
  // Add current profile to visited set
  visited.add(profileKey);
  
  const resolvedProfiles: ProfileInfo[] = [];
  
  // Process extends in order
  for (const extendRef of profile.extends || []) {
    try {
      const extendedProfile = await loadProfile(extendRef);
      
      // Recursively resolve extends for the extended profile
      const extendedResolved = await resolveExtends(
        extendedProfile,
        loadProfile,
        new Set(visited), // Create new set to avoid modifying original
        depth + 1
      );
      
      // Add resolved profiles (in order)
      resolvedProfiles.push(...extendedResolved);
      resolvedProfiles.push(extendedProfile);
    } catch (error) {
      throw new KbError(
        'ERR_EXTENDS_RESOLVE_FAILED',
        `Failed to resolve extends: ${extendRef}`,
        ERROR_HINTS.ERR_PROFILE_RESOLVE_FAILED,
        { extendRef, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  return resolvedProfiles;
}

/**
 * Merge profile exports with extends precedence (last wins)
 */
export function mergeProfileExports(
  baseProfile: ProfileInfo,
  extendedProfiles: ProfileInfo[]
): Record<string, Record<string, string | string[]>> {
  const merged: Record<string, Record<string, string | string[]>> = {};
  
  // Start with base profile exports
  for (const [product, exports] of Object.entries(baseProfile.exports)) {
    merged[product] = { ...exports };
  }
  
  // Apply extended profiles (last wins)
  for (const extendedProfile of extendedProfiles) {
    for (const [product, exports] of Object.entries(extendedProfile.exports)) {
      if (!merged[product]) {
        merged[product] = {};
      }
      
      // Merge exports for this product
      for (const [key, value] of Object.entries(exports)) {
        merged[product][key] = value;
      }
    }
  }
  
  return merged;
}

/**
 * Merge profile defaults with extends precedence (last wins)
 */
export function mergeProfileDefaults(
  baseProfile: ProfileInfo,
  extendedProfiles: ProfileInfo[]
): Record<string, { $ref: string }> {
  const merged: Record<string, { $ref: string }> = {};
  
  // Start with base profile defaults
  // Note: defaults are not part of ProfileInfo yet, this is a placeholder
  // for future implementation
  
  // Apply extended profiles (last wins)
  for (const _extendedProfile of extendedProfiles) {
    // Merge defaults for extended profile
    // This will be implemented when defaults are added to ProfileInfo
  }
  
  return merged;
}

/**
 * Validate extends references
 */
export function validateExtends(extendsList: string[]): void {
  for (const extendRef of extendsList) {
    if (!extendRef || typeof extendRef !== 'string') {
      throw new KbError(
        'ERR_EXTENDS_INVALID_REF',
        `Invalid extends reference: ${extendRef}`,
        'Extends references must be non-empty strings',
        { extendRef }
      );
    }
  }
}
