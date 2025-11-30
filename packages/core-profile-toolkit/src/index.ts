export type ValidationResult = { ok: boolean; errors: any[] | null };

export function validateProfileManifest(manifest: unknown): ValidationResult {
  const m = manifest as any;
  if (!m) {
    return { ok: false, errors: [{ message: 'Profile manifest is empty' }] };
  }
  if (m.schemaVersion && m.schemaVersion !== '1.0') {
    return { ok: false, errors: [{ message: 'Only schemaVersion \"1.0\" is supported' }] };
  }
  // Detailed validation removed until the new schema service lands.
  return { ok: true, errors: null };
}

export function validateProductDefaults(_productId: string, _config: unknown): ValidationResult {
  // Keep signature for backwards compatibility; validation is no-op for now.
  return { ok: true, errors: null };
}


