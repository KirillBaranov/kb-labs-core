/**
 * @module @kb-labs/core/config/api/product-config
 * High-level product configuration resolver with layered merge
 */
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { readWorkspaceConfig } from './read-config';
import { layeredMergeWithTrace } from '../merge/layered-merge';
import { toFsProduct } from '../utils/product-normalize';
import { computeConfigHash } from '../hash/config-hash';
import { resolvePreset, getPresetConfigForProduct } from '../preset/resolve-preset';
import { updateLockfile } from '../lockfile/lockfile';
/**
 * Get product configuration with layered merge and trace
 */
export async function getProductConfig(opts, schema, profileInfo) {
    const { cwd, product, cli = {}, writeFinal = false } = opts;
    const fsProduct = toFsProduct(product);
    // Read workspace configuration
    const workspaceConfig = await readWorkspaceConfig(cwd);
    // Build configuration layers
    const layers = [];
    // 1. Runtime defaults
    layers.push({
        label: 'runtime',
        value: getRuntimeDefaults(product),
        source: 'runtime:defaults',
    });
    // 2. Profile defaults
    let profileDefaults = {};
    if (profileInfo) {
        try {
            const mod = await import('@kb-labs/core-profiles');
            const getProductDefaults = mod.getProductDefaults;
            profileDefaults = await getProductDefaults(profileInfo, toFsProduct(product), schema);
        }
        catch (error) {
            // Profile defaults failed, continue without them
            console.warn('Warning: Could not load profile defaults:', error);
        }
    }
    layers.push({
        label: 'profile',
        value: profileDefaults,
        source: profileInfo
            ? `profile:${profileInfo.name}@${profileInfo.version}`
            : 'profile:none',
    });
    // 3. Preset defaults (resolve org preset if configured)
    let presetConfig = {};
    if (workspaceConfig?.data) {
        const workspaceData = workspaceConfig.data;
        if (workspaceData.$extends) {
            try {
                const preset = await resolvePreset(workspaceData.$extends, cwd);
                presetConfig = getPresetConfigForProduct(preset, product);
                layers.push({
                    label: 'preset',
                    value: presetConfig,
                    source: `preset:${workspaceData.$extends}`,
                });
            }
            catch (error) {
                // Preset resolution failed, continue without preset
                console.warn(`Warning: Could not resolve preset ${workspaceData.$extends}:`, error);
            }
        }
    }
    if (Object.keys(presetConfig).length === 0) {
        layers.push({
            label: 'preset',
            value: {},
            source: 'preset:none',
        });
    }
    // 4. Workspace config
    if (workspaceConfig?.data) {
        const workspaceData = workspaceConfig.data?.products?.[fsProduct] || {};
        layers.push({
            label: 'workspace',
            value: workspaceData,
            source: 'workspace:kb-labs.config',
        });
    }
    // 5. Local config (.kb/<product>/<product>.config.json)
    const localConfigPath = path.join(cwd, '.kb', fsProduct, `${fsProduct}.config.json`);
    try {
        const localConfig = await fsp.readFile(localConfigPath, 'utf-8');
        const localData = JSON.parse(localConfig);
        layers.push({
            label: 'local',
            value: localData,
            source: `local:.kb/${fsProduct}/${fsProduct}.config.json`,
        });
    }
    catch {
        // Local config is optional
    }
    // 6. CLI overrides
    if (Object.keys(cli).length > 0) {
        layers.push({
            label: 'cli',
            value: cli,
            source: 'cli:overrides',
        });
    }
    // Merge all layers
    const { merged, trace } = layeredMergeWithTrace(layers);
    // Validate against schema if provided
    if (schema) {
        // Schema validation will be implemented with AJV
        // For now, we'll skip validation
    }
    // Write final config if requested
    if (writeFinal) {
        await writeFinalConfig(cwd, fsProduct, merged);
    }
    // Update lockfile with config hash
    try {
        const configHash = computeConfigHash(merged);
        const configHashes = {};
        configHashes[product] = configHash;
        await updateLockfile(cwd, {
            configHashes
        });
    }
    catch (error) {
        // Lockfile update is optional, don't fail the config resolution
        console.warn('Warning: Could not update lockfile:', error);
    }
    return {
        config: merged,
        trace,
    };
}
/**
 * Explain product configuration (trace only)
 */
export async function explainProductConfig(opts, schema, profileInfo) {
    const result = await getProductConfig(opts, schema, profileInfo);
    return { trace: result.trace };
}
/**
 * Get runtime defaults for a product
 */
function getRuntimeDefaults(product) {
    const defaults = {
        devlink: {
            watch: true,
            build: true,
        },
        release: {
            version: '1.0.0',
            publish: false,
        },
        aiReview: {
            enabled: true,
            rules: [],
        },
        aiDocs: {
            enabled: true,
            templates: [],
        },
        devkit: {
            sync: true,
            check: true,
        },
    };
    return defaults[product] || {};
}
/**
 * Write final configuration to .kb/<product>/<product>.config.json
 */
async function writeFinalConfig(cwd, fsProduct, config) {
    const configDir = path.join(cwd, '.kb', fsProduct);
    const configPath = path.join(configDir, `${fsProduct}.config.json`);
    // Ensure directory exists
    await fsp.mkdir(configDir, { recursive: true });
    // Write config with schema version
    const finalConfig = {
        $schema: 'https://schemas.kb-labs.dev/config.schema.json',
        schemaVersion: '1.0',
        ...config,
    };
    await fsp.writeFile(configPath, JSON.stringify(finalConfig, null, 2));
}
/**
 * Get configuration hash for lockfile
 */
export function getConfigHash(config) {
    return computeConfigHash(config);
}
//# sourceMappingURL=product-config.js.map