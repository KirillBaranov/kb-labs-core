/**
 * @module @kb-labs/core/config/lockfile/lockfile
 * Lockfile generation and management
 */
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { computeConfigHash } from '../hash/config-hash';
import { toFsProduct } from '../utils/product-normalize';
/**
 * Read lockfile from workspace
 */
export async function readLockfile(cwd) {
    const lockfilePath = path.join(cwd, '.kb', 'lock.json');
    try {
        const lockfileData = await fsp.readFile(lockfilePath, 'utf-8');
        return JSON.parse(lockfileData);
    }
    catch {
        // Try old location for backward compatibility
        const oldLockfilePath = path.join(cwd, '.kb', 'lockfile.json');
        try {
            const lockfileData = await fsp.readFile(oldLockfilePath, 'utf-8');
            return JSON.parse(lockfileData);
        }
        catch {
            return null;
        }
    }
}
/**
 * Stable JSON serialization with sorted keys for predictable diffs
 */
function stableStringify(obj, space = 2) {
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((sorted, key) => {
                sorted[key] = value[key];
                return sorted;
            }, {});
        }
        return value;
    }, space);
}
/**
 * Write lockfile to workspace
 */
export async function writeLockfile(cwd, lockfileData) {
    const lockfileDir = path.join(cwd, '.kb');
    const lockfilePath = path.join(lockfileDir, 'lock.json');
    // Ensure .kb directory exists
    await fsp.mkdir(lockfileDir, { recursive: true });
    // Add schema if not present
    if (!lockfileData.$schema) {
        lockfileData.$schema = 'https://schemas.kb-labs.dev/lockfile.schema.json';
    }
    // Use atomic write with stable key ordering
    const { writeFileAtomic } = await import('../utils/fs-atomic');
    await writeFileAtomic(lockfilePath, stableStringify(lockfileData, 2) + '\n');
}
/**
 * Update lockfile with new hashes
 */
export async function updateLockfile(cwd, updates) {
    const existing = await readLockfile(cwd);
    const lockfileData = {
        $schema: 'https://schemas.kb-labs.dev/lockfile.schema.json',
        schemaVersion: '1.0',
        orgPreset: updates.orgPreset || existing?.orgPreset,
        profile: updates.profile || existing?.profile,
        policyBundle: updates.policyBundle || existing?.policyBundle,
        hashes: { ...existing?.hashes },
        generatedAt: new Date().toISOString(),
    };
    // Update config hashes
    if (updates.configHashes) {
        for (const [product, config] of Object.entries(updates.configHashes)) {
            const fsProduct = toFsProduct(product);
            const hash = computeConfigHash(config);
            lockfileData.hashes[fsProduct] = hash;
        }
    }
    await writeLockfile(cwd, lockfileData);
    return lockfileData;
}
/**
 * Get config hash for a product
 */
export function getLockfileConfigHash(product, config) {
    return computeConfigHash(config);
}
/**
 * Check if lockfile is up to date
 */
export async function isLockfileUpToDate(cwd, configs) {
    const lockfile = await readLockfile(cwd);
    if (!lockfile) {
        return false;
    }
    for (const [product, config] of Object.entries(configs)) {
        const fsProduct = toFsProduct(product);
        const currentHash = computeConfigHash(config);
        const lockfileHash = lockfile.hashes[fsProduct];
        if (currentHash !== lockfileHash) {
            return false;
        }
    }
    return true;
}
/**
 * Validate lockfile schema
 */
export function validateLockfile(lockfileData) {
    if (!lockfileData || typeof lockfileData !== 'object') {
        return false;
    }
    if (lockfileData.schemaVersion !== '1.0') {
        return false;
    }
    if (!lockfileData.hashes || typeof lockfileData.hashes !== 'object') {
        return false;
    }
    if (!lockfileData.generatedAt || typeof lockfileData.generatedAt !== 'string') {
        return false;
    }
    return true;
}
/**
 * Get lockfile statistics
 */
export function getLockfileStats(lockfileData) {
    return {
        productCount: Object.keys(lockfileData.hashes).length,
        hasOrgPreset: !!lockfileData.orgPreset,
        hasProfile: !!lockfileData.profile,
        hasPolicyBundle: !!lockfileData.policyBundle,
        generatedAt: new Date(lockfileData.generatedAt),
    };
}
//# sourceMappingURL=lockfile.js.map