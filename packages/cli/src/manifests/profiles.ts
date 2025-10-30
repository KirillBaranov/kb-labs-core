import type { CommandManifest } from '../cli/types';

/**
 * Profiles group commands
 */
export const profilesCommands: CommandManifest[] = [
  {
    manifestVersion: '1.0',
    id: 'profiles:resolve',
    group: 'profiles',
    describe: 'Resolve and display profile configuration',
    requires: ['@kb-labs/core-profiles@^0.1.0'],
    flags: [
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb profiles resolve', 'kb profiles resolve --profile-key production'],
    loader: async () => import('../cli/profiles/resolve'),
  },
  {
    manifestVersion: '1.0',
    id: 'profiles:validate',
    group: 'profiles',
    describe: 'Validate profile manifest (legacy and v1.0)',
    requires: ['@kb-labs/core-profiles@^0.1.0'],
    flags: [
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: [
      'kb profiles validate',
      'kb profiles validate --profile-key production --json'
    ],
    loader: async () => import('../cli/profiles/validate'),
  },
];

