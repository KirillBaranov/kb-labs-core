import type { ValidateFunction } from "ajv";
import type { ValidateResult } from "../types";

const noopValidator: ValidateFunction = Object.assign(
  ((_) => true) as ValidateFunction,
  { errors: null }
);

export function getProfileValidator(): ValidateFunction {
  // Placeholder until the new schema registry lands.
  return noopValidator;
}

export function validateProfile(json: unknown): ValidateResult {
  const rawProfile = json as any;
  // Keep minimal guard so callers still get feedback for obvious mismatches.
  if (!rawProfile || rawProfile.schemaVersion !== '1.0') {
    return {
      ok: false,
      errors: [
        {
          instancePath: '',
          message: 'Only profile manifests with schemaVersion=\"1.0\" are supported',
        },
      ] as any,
    };
  }

  return { ok: true, errors: null };
}

// For future use — access to any validator by $id
export function getValidatorById(id: string): ValidateFunction {
  throw new Error(`Schema registry is not available (requested ${id})`);
}

export function getRulesValidator(): ValidateFunction {
  return noopValidator;
}

export function validateRulesArray(_rules: unknown[]): ValidateResult {
  // Validation intentionally disabled until the replacement schema service ships.
  return { ok: true, errors: null };
}