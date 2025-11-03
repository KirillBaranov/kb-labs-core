import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ProductId } from '../types';
import { review as reviewSchema, docs as docsSchema, tests as testsSchema, assistant as assistantSchema, devlink as devlinkSchema } from '@kb-labs/profile-schemas';

export type ValidationResult = { ok: boolean; errors: any[] | null };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaMap: Partial<Record<ProductId, any>> = {
  aiReview: reviewSchema,
  aiDocs: docsSchema,
  devlink: devlinkSchema,
  devkit: testsSchema, // placeholder mapping
  release: assistantSchema, // placeholder mapping
  // extend with more products as needed
};

export function validateProductConfig(product: ProductId, config: unknown): ValidationResult {
  const schema = schemaMap[product];
  if (!schema) {return { ok: true, errors: null };}

  const validate = ajv.compile(schema);
  const ok = validate(config);
  return { ok: !!ok, errors: validate.errors || null };
}


