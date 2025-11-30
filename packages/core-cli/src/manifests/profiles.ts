import type { CommandManifest } from '../cli/types';

/**
 * Profiles group commands
 */
export const profilesCommands: CommandManifest[] = [
  {
    manifestVersion: '1.0',
    id: 'profiles:inspect',
    group: 'profiles',
    describe: 'Inspect profile configuration (Profiles v2)',
    requires: ['@kb-labs/core-config@^0.1.0'],
    flags: [
      { name: 'profile', type: 'string', description: 'Profile ID to inspect' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: [
      'kb profiles inspect --profile default',
      'kb profiles inspect --profile frontend',
      'kb profiles inspect --profile production --json'
    ],
    loader: async () => import('../cli/profiles/inspect'),
  },
  {
    manifestVersion: '1.0',
    id: 'profiles:resolve',
    group: 'profiles',
    describe: 'Resolve and display profile configuration (Profiles v2)',
    requires: ['@kb-labs/core-config@^0.1.0'],
    flags: [
      { name: 'profile', type: 'string', description: 'Profile ID to resolve' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: [
      'kb profiles resolve --profile default',
      'kb profiles resolve --profile frontend --json'
    ],
    loader: async () => import('../cli/profiles/resolve'),
  },
  {
    manifestVersion: '1.0',
    id: 'profiles:validate',
    group: 'profiles',
    describe: 'Validate profile configuration (Profiles v2)',
    requires: ['@kb-labs/core-config@^0.1.0'],
    flags: [
      { name: 'profile', type: 'string', description: 'Profile ID to validate' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: [
      'kb profiles validate --profile default',
      'kb profiles validate --profile production --json'
    ],
    loader: async () => import('../cli/profiles/validate'),
  },
];

