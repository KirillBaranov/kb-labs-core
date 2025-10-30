import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  profile as legacyProfileSchema,
  profileManifestV1 as profileManifestV1Schema,
  review as reviewSchema,
  docs as docsSchema,
  tests as testsSchema,
  assistant as assistantSchema,
  devlink as devlinkSchema,
  mind as mindSchema,
} from '@kb-labs/profile-schemas';

export type ValidationResult = { ok: boolean; errors: any[] | null };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
[legacyProfileSchema, profileManifestV1Schema, reviewSchema, docsSchema, testsSchema, assistantSchema, devlinkSchema, mindSchema].forEach((s: any) => ajv.addSchema(s));

const SCHEMA_ID = {
  profileLegacy: 'https://schemas.kb-labs.dev/profile/profile.schema.json',
  profileManifestV1: 'https://schemas.kb-labs.dev/profile/profile-manifest-v1.schema.json',
  products: {
    aiReview: reviewSchema.$id,
    aiDocs: docsSchema.$id,
    devlink: devlinkSchema.$id,
    devkit: testsSchema.$id,
    release: assistantSchema.$id,
    mind: mindSchema.$id,
  }
} as const;

export function validateProfileManifest(manifest: unknown): ValidationResult {
  const m = manifest as any;
  const id = m && m.schemaVersion === '1.0' ? SCHEMA_ID.profileManifestV1 : SCHEMA_ID.profileLegacy;
  const v = ajv.getSchema(id);
  if (!v) {
    return { ok: false, errors: [{ message: `Schema not registered: ${id}` }] };
  }
  const ok = v(manifest);
  return { ok: !!ok, errors: v.errors || null };
}

export function validateProductDefaults(productId: keyof typeof SCHEMA_ID.products, config: unknown): ValidationResult {
  const id = SCHEMA_ID.products[productId];
  if (!id) {
    return { ok: true, errors: null };
  }
  const v = ajv.getSchema(id);
  if (!v) {
    return { ok: false, errors: [{ message: `Schema not registered: ${id}` }] };
  }
  const ok = v(config);
  return { ok: !!ok, errors: v.errors || null };
}


