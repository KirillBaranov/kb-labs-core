/**
 * @module @kb-labs/core/config/errors
 * Standardized error class for KB Labs with exit code mapping
 */
export class KbError extends Error {
    code;
    hint;
    meta;
    constructor(code, message, hint, meta) {
        super(message);
        this.code = code;
        this.hint = hint;
        this.meta = meta;
        this.name = 'KbError';
    }
}
/**
 * Maps KbError codes to CLI exit codes
 */
export function getExitCode(err) {
    if (err.code === 'ERR_FORBIDDEN') {
        return 3;
    }
    if (err.code === 'ERR_CONFIG_NOT_FOUND') {
        return 2;
    }
    if (err.code === 'ERR_CONFIG_EXISTS_CONFLICT') {
        return 2;
    }
    if (err.code === 'ERR_PATH_OUTSIDE_WORKSPACE') {
        return 2;
    }
    if (err.code.startsWith('ERR_')) {
        return 1;
    }
    return 1;
}
/**
 * Error codes with their standard hints
 */
export const ERROR_HINTS = {
    ERR_CONFIG_NOT_FOUND: 'Create kb-labs.config.yaml or run: kb init',
    ERR_CONFIG_INVALID: 'Check configuration syntax and required fields',
    ERR_CONFIG_EXISTS_CONFLICT: 'Use --force to overwrite existing configuration',
    ERR_PATH_OUTSIDE_WORKSPACE: 'Check cwd or use a relative path within the workspace',
    ERR_PRESET_NOT_RESOLVED: 'Install the required preset package or check network connectivity',
    ERR_PROFILE_INCOMPATIBLE: 'Profile version is incompatible with current system',
    ERR_PROFILE_NOT_DEFINED: 'Add profiles.default to kb-labs.config.yaml',
    ERR_PROFILE_RESOLVE_FAILED: 'pnpm add -D @kb-labs/profile-...',
    ERR_PROFILE_INVALID_FORMAT: 'Recreate profile with: kb init profile --scaffold-local-profile',
    ERR_ARTIFACT_LIMIT_EXCEEDED: 'Remove or split large artifacts, or reduce artifact count',
    ERR_FORBIDDEN: 'Add role in policy.overrides or use preset...',
};
//# sourceMappingURL=kb-error.js.map