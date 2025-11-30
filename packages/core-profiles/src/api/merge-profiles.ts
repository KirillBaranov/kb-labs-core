/**
 * @module @kb-labs/core-profiles/merge-profiles
 * Profile merging functionality with deep merge rules
 */

import { mergeProfiles as mergeProfilesInternal } from "../resolver/merge";
import type { RawProfile } from "../types";

/**
 * Merge multiple profiles with deep merge rules:
 * - objects: deep merge
 * - arrays (rules): concatenation + de-dup by id
 * - primitives: last wins
 * 
 * @param base - Base profile to merge into
 * @param next - Profile to merge on top of base
 * @returns Merged profile
 */
export function mergeProfiles(base: RawProfile, next: RawProfile): RawProfile;

/**
 * Merge a chain of profiles (for internal use)
 * 
 * @param chain - Array of profiles to merge in order
 * @returns Merged profile
 */
export function mergeProfiles(chain: RawProfile[]): RawProfile;

export function mergeProfiles(baseOrChain: RawProfile | RawProfile[], next?: RawProfile): RawProfile {
  if (Array.isArray(baseOrChain)) {
    // Chain merge
    return mergeProfilesInternal(baseOrChain);
  } else {
    // Two profile merge
    if (next === undefined) {
      throw new Error("Second profile is required for two-argument merge");
    }
    return mergeProfilesInternal([baseOrChain, next]);
  }
}
