import type { CommandManifest } from '../cli/types';

/**
 * Bundle group commands
 */
export const bundleCommands: CommandManifest[] = [
  {
    manifestVersion: '1.0',
    id: 'bundle:print',
    group: 'bundle',
    describe: 'Print complete bundle for product',
    requires: ['@kb-labs/core-bundle@^0.1.0'],
    flags: [
      { name: 'product', type: 'string', required: true },
      { name: 'profile', type: 'string', description: 'Profile ID (Profiles v2)' },
      { name: 'scope', type: 'string', description: 'Scope ID within profile' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' },
      { name: 'with-trace', type: 'boolean' }
    ],
    examples: [
      'kb bundle print --product aiReview',
      'kb bundle print --product aiReview --profile frontend',
      'kb bundle print --product aiReview --profile frontend --scope backend --with-trace'
    ],
    loader: async () => import('../cli/bundle/print'),
  },
  {
    manifestVersion: '1.0',
    id: 'bundle:inspect',
    group: 'bundle',
    describe: 'Inspect bundle (profile + config + artifacts + trace)',
    requires: ['@kb-labs/core-bundle@^0.1.0'],
    flags: [
      { name: 'product', type: 'string', required: true },
      { name: 'profile', type: 'string', description: 'Profile ID (Profiles v2)' },
      { name: 'scope', type: 'string', description: 'Scope ID within profile' },
      { name: 'trace', type: 'boolean' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: [
      'kb bundle inspect --product aiReview',
      'kb bundle inspect --product aiReview --profile frontend --trace',
      'kb bundle inspect --product aiReview --profile frontend --scope backend'
    ],
    loader: async () => import('../cli/bundle/inspect'),
  },
];

