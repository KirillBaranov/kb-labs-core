/**
 * Config artifacts detection for KB Labs Core
 * Detects configuration issues and missing files
 */

import { promises as fsp } from 'node:fs';
import { join } from 'path';
import { readWorkspaceConfig } from '@kb-labs/core-config';

export interface ConfigArtifacts {
  missingWorkspaceConfig: boolean;
  missingProfiles: string[];
  invalidProfiles: string[];
  missingLockfile: boolean;
  outdatedLockfile: boolean;
  missingProductConfigs: string[];
  protocolConflicts: string[]; // Profiles using different protocols (npm vs link)
}

/**
 * Detect all configuration artifacts and issues
 */
export async function detectConfigArtifacts(cwd: string): Promise<ConfigArtifacts> {
  const artifacts: ConfigArtifacts = {
    missingWorkspaceConfig: false,
    missingProfiles: [],
    invalidProfiles: [],
    missingLockfile: false,
    outdatedLockfile: false,
    missingProductConfigs: [],
    protocolConflicts: [],
  };
  
  // Check workspace config
  const configFiles = ['kb-labs.config.yaml', 'kb-labs.config.json'];
  const hasConfig = await Promise.allSettled(
    configFiles.map(f => fsp.access(join(cwd, f)).then(() => true))
  );
  artifacts.missingWorkspaceConfig = !hasConfig.some(r => r.status === 'fulfilled' && r.value);
  
  // Check lockfile
  const lockPath = join(cwd, '.kb', 'lock.json');
  try {
    await fsp.access(lockPath);
    // TODO: Check if lockfile is outdated
  } catch {
    artifacts.missingLockfile = true;
  }
  
  // Check profiles if workspace config exists
  if (!artifacts.missingWorkspaceConfig) {
    try {
      const workspaceConfig = await readWorkspaceConfig(cwd);
      if (workspaceConfig?.data) {
        const profiles = (workspaceConfig.data as any).profiles || {};
        for (const [key, ref] of Object.entries(profiles)) {
          const profilePath = join(cwd, '.kb', 'profiles', key, 'profile.json');
          try {
            await fsp.access(profilePath);
            // Try to read and parse profile.json to validate
            const content = await fsp.readFile(profilePath, 'utf-8');
            JSON.parse(content);
          } catch {
            if (typeof ref === 'string' && ref.startsWith('./')) {
              // Local path
              artifacts.missingProfiles.push(key);
            } else {
              // npm package
              artifacts.missingProfiles.push(key);
            }
          }
        }
      }
    } catch {
      // Workspace config read failed
    }
  }
  
  return artifacts;
}

/**
 * Get cleanup suggestions based on detected artifacts
 */
export function getCleanupSuggestions(artifacts: ConfigArtifacts): string[] {
  const suggestions: string[] = [];
  
  if (artifacts.missingWorkspaceConfig) {
    suggestions.push('Run "kb init workspace" to create workspace config');
  }
  
  if (artifacts.missingProfiles.length > 0) {
    suggestions.push('Run "kb init profile" to set up missing profiles');
  }
  
  if (artifacts.missingLockfile) {
    suggestions.push('Run "kb init setup" to create lockfile');
  }
  
  if (artifacts.invalidProfiles.length > 0) {
    suggestions.push('Run "kb profiles validate" to check profiles');
  }
  
  return suggestions;
}

