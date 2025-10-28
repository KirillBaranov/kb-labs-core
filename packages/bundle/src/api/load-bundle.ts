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
  ProductId,
  MergeTrace 
} from '@kb-labs/core-config';
import { 
  loadProfile, 
  extractProfileInfo, 
  normalizeManifest,
  listArtifacts,
  materializeArtifacts,
  clearCaches as clearProfileCaches
} from '@kb-labs/core-profiles';
import { 
  resolvePolicy, 
  createPermitsFunction 
} from '@kb-labs/core-policy';
import { KbError, ERROR_HINTS } from '@kb-labs/core-config';
import type { LoadBundleOptions, Bundle } from '../types/types';

/**
 * Load bundle with config, profile, artifacts, and policy
 */
export async function loadBundle(opts: LoadBundleOptions): Promise<Bundle> {
  const { cwd, product, profileKey = 'default', cli, writeFinalConfig } = opts;
  const fsProduct = toFsProduct(product);

  // 1. Read workspace config
  const workspaceConfig = await readWorkspaceConfig(cwd);
  if (!workspaceConfig?.data) {
    throw new KbError(
      'ERR_CONFIG_NOT_FOUND',
      'No workspace configuration found',
      ERROR_HINTS.ERR_CONFIG_NOT_FOUND,
      { cwd }
    );
  }

  const workspaceData = workspaceConfig.data as any;

  // 2. Resolve profile
  const profiles = workspaceData.profiles || {};
  const profileRef = profiles[profileKey];
  
  if (!profileRef) {
    throw new KbError(
      'ERR_PROFILE_NOT_DEFINED',
      `Profile key "${profileKey}" not found`,
      ERROR_HINTS.ERR_PROFILE_NOT_DEFINED,
      { profileKey, available: Object.keys(profiles) }
    );
  }

  // Load profile
  const profile = await loadProfile({ cwd, name: profileRef });
  const manifest = normalizeManifest(profile.profile);
  const profileInfo = extractProfileInfo(manifest, profile.meta.pathAbs);

  // 3. Get product configuration
  const configResult = await getProductConfig({
    cwd,
    product,
    cli,
    writeFinal: writeFinalConfig
  }, null);

  // 4. Resolve policy
  const policyResult = await resolvePolicy({
    presetBundle: workspaceData.policy?.bundle,
    workspaceOverrides: workspaceData.policy?.overrides
  });

  // 5. Create artifacts wrapper
  const artifacts = createArtifactsWrapper(profileInfo, fsProduct, cwd);

  // 6. Create policy wrapper
  const policy = {
    bundle: policyResult.bundle,
    permits: createPermitsFunction(policyResult.policy, { roles: ['user'] })
  };

  return {
    product,
    config: configResult.config,
    profile: {
      key: profileKey,
      name: profileInfo.name,
      version: profileInfo.version,
      overlays: profileInfo.overlays
    },
    artifacts,
    policy,
    trace: configResult.trace
  };
}

/**
 * Create artifacts wrapper with lazy loading
 */
function createArtifactsWrapper(
  profileInfo: any,
  fsProduct: string,
  cwd: string
) {
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
    }
  };
}

/**
 * Clear all caches
 */
export function clearCaches(): void {
  clearProfileCaches();
  // Note: config cache clearing would be imported from @kb-labs/core-config
  // but we'll handle it in the main index.ts
}
