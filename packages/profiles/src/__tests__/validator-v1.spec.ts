import { describe, it, expect } from 'vitest';
import { validateProfile } from '../api/validate-profile';

describe('profiles: validate v1 manifest', () => {
  it('accepts valid v1 manifest', () => {
    const manifest = {
      schemaVersion: '1.0',
      name: 'test',
      version: '0.1.0',
      extends: [],
      exports: { 'ai-review': { rules: 'artifacts/ai-review/rules.yml' } },
      defaults: { 'ai-review': { $ref: './defaults/ai-review.json' } },
    };
    const result = validateProfile(manifest as any);
    expect(result.ok).toBe(true);
  });

  it('rejects missing required fields', () => {
    const manifest = {
      schemaVersion: '1.0',
      name: 'test'
    };
    const result = validateProfile(manifest as any);
    expect(result.ok).toBe(false);
    expect(result.errors).toBeTruthy();
  });
});


