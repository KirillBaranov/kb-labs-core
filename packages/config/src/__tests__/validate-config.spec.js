import { describe, it, expect } from 'vitest';
import { validateProductConfig } from '../validation/validate-config';
describe('config: validate product config', () => {
    it('validates aiReview config with review schema', () => {
        const cfg = { rules: [], maxFiles: 10 };
        const result = validateProductConfig('aiReview', cfg);
        expect(result.ok).toBe(true);
    });
    it('allows unknown product (no schema)', () => {
        const result = validateProductConfig('release', {});
        expect(result.ok).toBe(true);
    });
});
//# sourceMappingURL=validate-config.spec.js.map