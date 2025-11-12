/**
 * @module @kb-labs/core-bundle/api/explain-bundle
 * Bundle explanation logic
 */

import type {
  MergeTrace
} from '@kb-labs/core-config';
import { 
  explainProductConfig,
  readWorkspaceConfig,
} from '@kb-labs/core-config';
import type { ProductId } from '@kb-labs/core-types';
import {
  loadProfile,
  extractProfileInfo,
  normalizeManifest
} from '@kb-labs/core-profiles';
import { KbError, ERROR_HINTS } from '@kb-labs/core-config';
import { resolveWorkspaceRoot } from '@kb-labs/core-workspace';
import type { ExplainBundleOptions } from '../types/types';

/**
 * Explain bundle configuration (trace only)
 */
export async function explainBundle(opts: ExplainBundleOptions): Promise<MergeTrace[]> {
  const { cwd: requestedCwd, product, cli, profileKey = 'default' } = opts;

  const workspaceResolution = await resolveWorkspaceRoot({
    cwd: requestedCwd,
    startDir: requestedCwd ?? process.cwd(),
  });
  const cwd = workspaceResolution.rootDir;
  
  // Read workspace config
  const workspaceConfig = await readWorkspaceConfig(cwd);
  if (!workspaceConfig?.data) {
    throw new KbError(
      'ERR_CONFIG_NOT_FOUND',
      'No workspace configuration found',
      ERROR_HINTS.ERR_CONFIG_NOT_FOUND,
      { cwd }
    );
  }
  
  // Load profile if available
  let profileInfo;
  const workspaceData = workspaceConfig.data as any;
  const profiles = workspaceData.profiles || {};
  const profileRef = profiles[profileKey];
  
  if (profileRef) {
    try {
      const profile = await loadProfile({ cwd, name: profileRef });
      const manifest = normalizeManifest(profile.profile);
      profileInfo = extractProfileInfo(manifest, profile.meta.pathAbs);
    } catch (error) {
      // Profile loading failed, continue without it
      console.warn('Warning: Could not load profile for explanation:', error);
    }
  }
  
  // Get configuration trace without resolving
  const result = await explainProductConfig({
    cwd,
    product,
    cli
  }, null, profileInfo);
  
  return result.trace;
}
