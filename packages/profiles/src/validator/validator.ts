import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { SCHEMA_ID } from "../constants";
import {
  profile as profileSchema,
  rules as rulesSchema,
  io as ioSchema,
  diff as diffSchema,
  cap as capSchema,
} from "@kb-labs/profile-schemas";
import type { ValidateResult } from "../types";

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  // register all schemas once; ajv uses $id
  [profileSchema, ioSchema, diffSchema, capSchema, rulesSchema].forEach((s: any) =>
    ajv.addSchema(s)
  );
  return ajv;
}

let _ajv: Ajv | null = null;
function ajv(): Ajv {
  return _ajv ?? (_ajv = createAjv());
}

export function getProfileValidator(): ValidateFunction {
  const v = ajv().getSchema(SCHEMA_ID.profile);
  if (!v) { throw new Error("Profile schema is not registered"); }
  return v;
}

export function validateProfile(json: unknown): ValidateResult {
  const v = getProfileValidator();
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