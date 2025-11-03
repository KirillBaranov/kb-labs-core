/**
 * Config suggestions generator for KB Labs Core
 */

import { type CommandSuggestion } from '@kb-labs/shared-cli-ui';
import type { ConfigArtifacts } from '../artifacts/config-artifacts';

/**
 * Generate config-specific suggestions
 */
export function generateConfigSuggestions(
  artifacts: ConfigArtifacts,
  _context: any
): CommandSuggestion[] {
  const suggestions: CommandSuggestion[] = [];

  if (artifacts.missingWorkspaceConfig) {
    suggestions.push({
      id: 'CONFIG_INIT_WORKSPACE',
      command: 'kb init workspace',
      args: [],
      description: 'Initialize workspace configuration',
      impact: 'safe',
      when: 'CONFIG_MISSING',
      available: true
    });
  }

  if (artifacts.missingProfiles.length > 0) {
    suggestions.push({
      id: 'CONFIG_INIT_PROFILE',
      command: 'kb init profile',
      args: ['--scaffold-local-profile'],
      description: `Initialize missing profiles: ${artifacts.missingProfiles.join(', ')}`,
      impact: 'safe',
      when: 'PROFILE_MISSING',
      available: true
    });
  }

  if (artifacts.missingLockfile) {
    suggestions.push({
      id: 'CONFIG_INIT_SETUP',
      command: 'kb init setup',
      args: ['--yes'],
      description: 'Run complete setup to fix configuration issues',
      impact: 'safe',
      when: 'LOCKFILE_ISSUE',
      available: true
    });
  }

  if (artifacts.invalidProfiles.length > 0) {
    suggestions.push({
      id: 'CONFIG_VALIDATE_PROFILE',
      command: 'kb profiles validate',
      args: [],
      description: 'Validate profile configuration',
      impact: 'safe',
      when: 'PROFILE_INVALID',
      available: true
    });
  }

  return suggestions;
}

