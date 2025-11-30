/**
 * @module @kb-labs/core-profiles/validate-profile
 * Profile validation functionality using Ajv + schemas
 */

import { validateProfile as validateProfileInternal } from "../validator";
import type { RawProfile, ValidateResult } from "../types";

/**
 * Validate a profile (schema validation temporarily disabled)
 * 
 * @param profile - Raw profile data to validate
 * @returns Validation result with ok flag and errors array
 */
export function validateProfile(profile: RawProfile): ValidateResult {
  return validateProfileInternal(profile);
}
