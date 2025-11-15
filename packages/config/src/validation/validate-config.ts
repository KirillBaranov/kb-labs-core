import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ProductId } from '../types';

export type ValidationResult = { ok: boolean; errors: any[] | null };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaMap: Partial<Record<ProductId, any>> = {};

/**
 * Temporary schema registry hook – upcoming implementation will register schemas here.
 */
export function registerProductSchema(product: ProductId, schema: any): void {
  schemaMap[product] = schema;
}

export function validateProductConfig(product: ProductId, config: unknown): ValidationResult {
  const schema = schemaMap[product];
  if (!schema) {return { ok: true, errors: null };}

  const validate = ajv.compile(schema);
  const ok = validate(config);
  return { ok: !!ok, errors: validate.errors || null };
}


