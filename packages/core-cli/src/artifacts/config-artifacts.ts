/**
 * Config artifacts detection for KB Labs Core
 * Detects configuration issues and missing files
 */

import { promises as fsp } from 'node:fs';
import { join } from 'path';
import { stat } from 'node:fs/promises';
import { readWorkspaceConfig, readProfilesSection, KbError } from '@kb-labs/core-config';

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
  const configFiles = ['.kb/kb.config.yaml', '.kb/kb.config.json'];
  const hasConfig = await Promise.allSettled(
    configFiles.map(f => fsp.access(join(cwd, f)).then(() => true))
  );
  artifacts.missingWorkspaceConfig = !hasConfig.some(r => r.status === 'fulfilled' && r.value);
  
  // Check lockfile
  const lockPath = join(cwd, '.kb', 'lock.json');
  try {
    await fsp.access(lockPath);
    // Check if lockfile is outdated by comparing with config files
    try {
      const lockfileStat = await stat(lockPath);
      const configFiles = ['.kb/kb.config.json', '.kb/kb.config.yaml'];
      const configPaths = configFiles.map(f => join(cwd, f));
      
      for (const configPath of configPaths) {
        try {
          const configStat = await stat(configPath);
          // If config file is newer than lockfile, lockfile might be outdated
          if (configStat.mtime > lockfileStat.mtime) {
            artifacts.outdatedLockfile = true;
            break;
          }
        } catch {
          // Config file doesn't exist, skip
        }
      }
    } catch {
      // Can't stat lockfile, assume it's not outdated
    }
  } catch {
    artifacts.missingLockfile = true;
  }
  
  try {
    const profilesResult = await readProfilesSection(cwd);
    const definedProfiles = profilesResult.profiles.length;
    const hasKbConfig = !!profilesResult.sourcePath;

    if (!hasKbConfig || definedProfiles === 0) {
      artifacts.missingProfiles.push('default');
    }
  } catch (error) {
    if (error instanceof KbError && error.code === 'ERR_PROFILE_INVALID_FORMAT') {
      artifacts.invalidProfiles.push('kb.config');
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
    suggestions.push(
      `Add profiles[] entries in kb.config.json (missing: ${artifacts.missingProfiles.join(', ')})`
    );
  }
  
  if (artifacts.missingLockfile) {
    suggestions.push('Run "kb init setup" to create lockfile');
  }
  
  if (artifacts.outdatedLockfile) {
    suggestions.push('Run "kb init setup" to update lockfile');
  }
  
  if (artifacts.invalidProfiles.length > 0) {
    suggestions.push('Run "kb profiles validate" to check profiles');
  }
  
  return suggestions;
}

