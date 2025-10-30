import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { SCHEMA_ID } from "../constants";
import { rules as rulesSchema, io as ioSchema, diff as diffSchema, cap as capSchema, profileManifestV1 as profileManifestV1Schema } from "@kb-labs/profile-schemas";
import type { ValidateResult } from "../types";

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  // register schemas once; ajv uses $id (v1 manifest only)
  [profileManifestV1Schema, ioSchema, diffSchema, capSchema, rulesSchema].forEach((s: any) =>
    ajv.addSchema(s)
  );
  return ajv;
}

let _ajv: Ajv | null = null;
function ajv(): Ajv {
  return _ajv ?? (_ajv = createAjv());
}

export function getProfileValidator(): ValidateFunction {
  // point to v1 manifest validator (legacy format no longer supported)
  const v = ajv().getSchema(SCHEMA_ID.profileManifestV1);
  if (!v) { throw new Error("Profile schema is not registered"); }
  return v;
}

export function validateProfile(json: unknown): ValidateResult {
  const rawProfile = json as any;
  // Only v1.0 manifest is supported
  if (!rawProfile || rawProfile.schemaVersion !== '1.0') {
    return {
      ok: false,
      errors: [
        {
          instancePath: '',
          message: 'Only profile manifests with schemaVersion="1.0" are supported',
        },
      ] as any,
    };
  }

  const v = ajv().getSchema(SCHEMA_ID.profileManifestV1);
  if (!v) { throw new Error("Profile v1 schema is not registered"); }
  const ok = v(json);
  return { ok: !!ok, errors: ok ? null : (v.errors as any) ?? null };
}

// For future use — access to any validator by $id
export function getValidatorById(id: string): ValidateFunction {
  const v = ajv().getSchema(id);
  if (!v) { throw new Error(`Schema not registered: ${id}`); }
  return v;
}

export function getRulesValidator(): ValidateFunction {
  const v = ajv().getSchema(SCHEMA_ID.rules);
  if (!v) { throw new Error("Rules schema is not registered"); }
  return v;
}

export function validateRulesArray(rules: unknown[]): ValidateResult {
  const v = getRulesValidator();

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ok = v(rule);
    if (!ok) {
      return {
        ok: false,
        errors: (v.errors as any)?.map((e: any) => ({
          ...e,
          instancePath: `[${i}]${e.instancePath || ''}`
        })) ?? null
      };
    }
  }

  return { ok: true, errors: null };
}