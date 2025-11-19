/**
 * @module @kb-labs/core-bundle/api/load-bundle
 * Bundle orchestration logic
 */

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { 
  getProductConfig, 
  toFsProduct, 
  readWorkspaceConfig,
  readProfilesSection,
  resolveProfile as resolveProfileV2,
  selectProfileScope,
  MergeTrace,
  validateProductConfig,
  type BundleProfile,
  type ProfileLayerInput,
} from '@kb-labs/core-config';
import type { ProductId } from '@kb-labs/core-types';
import {
  loadProfile, 
  extractProfileInfo, 
  normalizeManifest,
  listArtifacts,
  materializeArtifacts,
  readArtifactText,
  readArtifactJson,
  clearCaches as clearProfileCaches,
  type ProfileInfo
} from '@kb-labs/core-profiles';
import {
  resolvePolicy, 
  createPermitsFunction 
} from '@kb-labs/core-policy';
import { KbError, ERROR_HINTS } from '@kb-labs/core-config';
import { resolveWorkspaceRoot } from '@kb-labs/core-workspace';
import { getLogger } from '@kb-labs/core-sys';
import type { LoadBundleOptions, Bundle } from '../types/types';

const log = getLogger('core-bundle');

/**
 * Load bundle with config, profile, artifacts, and policy
 */
export async function loadBundle<T = any>(opts: LoadBundleOptions): Promise<Bundle<T>> {
  const {
    cwd: requestedCwd,
    product,
    profileId: explicitProfileId,
    scopeId,
    cli,
    writeFinalConfig,
    validate,
  } = opts;
  const fsProduct = toFsProduct(product);

  const workspaceResolution = await resolveWorkspaceRoot({
    cwd: requestedCwd,
    startDir: requestedCwd ?? process.cwd(),
  });
  const cwd = workspaceResolution.rootDir;
  const executionPath = requestedCwd ? path.resolve(requestedCwd) : process.cwd();

  const workspaceConfig = await readWorkspaceConfig(cwd);
  if (!workspaceConfig?.data) {
    throw new KbError(
      'ERR_CONFIG_NOT_FOUND',
      'No workspace configuration found',
      ERROR_HINTS.ERR_CONFIG_NOT_FOUND,
      { cwd }
    );
  }

  const workspaceData = workspaceConfig.data as Record<string, unknown>;

  const profilesSection = await readProfilesSection(cwd);
  const availableProfiles = profilesSection.profiles.map((p) => p.id);
  const profileId = determineProfileId(explicitProfileId, availableProfiles);
  if (!profileId && scopeId) {
    throw new KbError(
      'ERR_PROFILE_NOT_DEFINED',
      'Scope selection requires a profile. Pass --profile=<id>.',
      ERROR_HINTS.ERR_PROFILE_NOT_DEFINED,
      { available: availableProfiles }
    );
  }

  let bundleProfile: BundleProfile | null = null;
  let profileLayerInput: ProfileLayerInput | undefined;

  if (profileId) {
    bundleProfile = await resolveProfileV2({ cwd, profileId });
    const scopeSelection = selectProfileScope({
      bundleProfile,
      cwd,
      executionPath,
      scopeId,
    });
    bundleProfile.scopeSelection = scopeSelection;
    if (scopeSelection.scope) {
      bundleProfile.activeScopeId = scopeSelection.scope.id;
      bundleProfile.activeScope = scopeSelection.scope;
    }
    profileLayerInput = buildProfileLayer(bundleProfile, product);
  }

  const configResult = await getProductConfig({
    cwd,
    product,
    cli,
    writeFinal: writeFinalConfig,
    profileLayer: profileLayerInput,
  }, null);

  // Optional validation
  if (validate) {
    const result = validateProductConfig(product, configResult.config);
    if (!result.ok) {
      if (validate === 'warn') {
        log.warn('Config validation warnings', { errors: result.errors });
      } else {
        const err = new Error('Config validation failed') as Error & { details: unknown };
        err.details = result.errors;
        throw err;
      }
    }
  }

  // Support legacy profile format for artifacts (backward compatibility)
  // Profiles v2 uses profileId from profiles section, but old configs may reference profiles directly
  let legacyProfileInfo: ProfileInfo | undefined;
  const legacyProfiles = (workspaceData.profiles as Record<string, string>) || {};
  const legacyProfileRef = profileId ? legacyProfiles[profileId] : undefined;

  if (legacyProfileRef) {
    try {
      const legacyProfile = await loadProfile({ cwd, name: legacyProfileRef });
      const legacyManifest = normalizeManifest(legacyProfile.profile);
      legacyProfileInfo = extractProfileInfo(legacyManifest, legacyProfile.meta.pathAbs);
    } catch (error) {
      log.warn('Could not load legacy profile manifest', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 4. Resolve policy
  const policyConfig = workspaceData.policy as { bundle?: string; overrides?: import('@kb-labs/core-policy').Policy } | undefined;
  const policyResult = await resolvePolicy({
    presetBundle: policyConfig?.bundle,
    workspaceOverrides: policyConfig?.overrides
  });

  // 5. Create artifacts wrapper
  const artifacts = createArtifactsWrapper(legacyProfileInfo, fsProduct, cwd);

  // 6. Create policy wrapper
  const policy = {
    bundle: policyResult.bundle,
    permits: createPermitsFunction(policyResult.policy, { roles: ['user'] })
  };

  return {
    product,
    config: configResult.config as unknown as T,
    profile: bundleProfile,
    artifacts,
    policy,
    trace: configResult.trace
  };
}

/**
 * Create artifacts wrapper with lazy loading
 */
function createArtifactsWrapper(
  profileInfo: ProfileInfo | undefined,
  fsProduct: string,
  cwd: string
) {
  if (!profileInfo) {
    return {
      summary: {},
      async list() { return []; },
      async materialize() { return { filesCopied: 0, filesSkipped: 0, bytesWritten: 0 }; },
      async readText() { throw new KbError('ERR_PROFILE_NOT_DEFINED', 'Profile artifacts are not configured', ERROR_HINTS.ERR_PROFILE_NOT_DEFINED); },
      async readJson() { throw new KbError('ERR_PROFILE_NOT_DEFINED', 'Profile artifacts are not configured', ERROR_HINTS.ERR_PROFILE_NOT_DEFINED); },
      async readAll() { return []; },
    };
  }

  // Get artifact summary from profile exports
  const productExports = profileInfo.exports[fsProduct] || {};
  const summary: Record<string, string[]> = {};
  
  for (const [key, patterns] of Object.entries(productExports)) {
    if (Array.isArray(patterns)) {
      summary[key] = patterns;
    } else if (typeof patterns === 'string') {
      summary[key] = [patterns];
    }
  }

  return {
    summary,
    
    async list(key: string): Promise<Array<{ relPath: string; sha256: string }>> {
      const artifacts = await listArtifacts(profileInfo, {
        product: fsProduct,
        key
      });
      
      return artifacts.map(artifact => ({
        relPath: artifact.relPath,
        sha256: artifact.sha256
      }));
    },

    async materialize(keys?: string[]): Promise<{
      filesCopied: number;
      filesSkipped: number;
      bytesWritten: number;
    }> {
      const destDir = path.join(cwd, '.kb', fsProduct);
      const result = await materializeArtifacts(
        profileInfo,
        fsProduct,
        destDir,
        keys
      );
      
      return {
        filesCopied: result.filesCopied,
        filesSkipped: result.filesSkipped,
        bytesWritten: result.bytesWritten
      };
    },
    
    // Convenience methods for better DX
    async readText(relPath: string): Promise<string> {
      const result = await readArtifactText(profileInfo, relPath);
      return result.text;
    },
    
    async readJson<T = any>(relPath: string): Promise<T> {
      const result = await readArtifactJson<T>(profileInfo, relPath);
      return result.data;
    },
    
    async readAll(key: string): Promise<Array<{ path: string; content: string }>> {
      const artifacts = await listArtifacts(profileInfo, {
        product: fsProduct,
        key
      });
      
      const contents = await Promise.all(
        artifacts.map(async (artifact) => {
          const result = await readArtifactText(profileInfo, artifact.relPath);
          return {
            path: artifact.relPath,
            content: result.text
          };
        })
      );
      
      return contents;
    }
  };
}

function determineProfileId(explicit: string | undefined, available: string[]): string | undefined {
  if (explicit) {
    return explicit;
  }
  if (available.length === 1) {
    return available[0];
  }
  return undefined;
}

function buildProfileLayer(bundleProfile: BundleProfile, product: ProductId): ProfileLayerInput {
  const fsProduct = toFsProduct(product);
  const profileOverlay = cloneOverlay(
    bundleProfile.products?.[product] ?? bundleProfile.products?.[fsProduct]
  );
  const layer: ProfileLayerInput = {
    profileId: bundleProfile.id,
    source: buildProfileSource(bundleProfile),
    products: profileOverlay,
  };

  if (bundleProfile.activeScopeId && bundleProfile.productsByScope) {
    const scopeProducts = bundleProfile.productsByScope[bundleProfile.activeScopeId];
    const scopeOverlay = cloneOverlay(
      scopeProducts?.[product] ?? scopeProducts?.[fsProduct]
    );
    if (scopeOverlay) {
      layer.scope = {
        id: bundleProfile.activeScopeId,
        source: `profile-scope:${bundleProfile.activeScopeId}`,
        products: scopeOverlay,
      };
    }
  }

  return layer;
}

function buildProfileSource(profile: BundleProfile): string {
  const versionPart = profile.version ? `@${profile.version}` : '';
  return `profile:${profile.id}${versionPart}`;
}

function cloneOverlay(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value) as Record<string, unknown>;
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

/**
 * Clear all caches
 */
export function clearCaches(): void {
  clearProfileCaches();
  // Note: config cache clearing would be imported from @kb-labs/core-config
  // but we'll handle it in the main index.ts
}
