import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { review as reviewSchema, docs as docsSchema, tests as testsSchema, assistant as assistantSchema, devlink as devlinkSchema } from '@kb-labs/profile-schemas';
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schemaMap = {
    aiReview: reviewSchema,
    aiDocs: docsSchema,
    devlink: devlinkSchema,
    devkit: testsSchema, // placeholder mapping
    release: assistantSchema, // placeholder mapping
    // extend with more products as needed
};
export function validateProductConfig(product, config) {
    const schema = schemaMap[product];
    if (!schema)
        return { ok: true, errors: null };
    const validate = ajv.compile(schema);
    const ok = validate(config);
    return { ok: !!ok, errors: validate.errors || null };
}
//# sourceMappingURL=validate-config.js.map