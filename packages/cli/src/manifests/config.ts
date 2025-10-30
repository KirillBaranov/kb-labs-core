import type { CommandManifest } from '../cli/types';

/**
 * Config group commands
 */
export const configCommands: CommandManifest[] = [
  {
    manifestVersion: '1.0',
    id: 'config:get',
    group: 'config',
    describe: 'Get product configuration',
    requires: ['@kb-labs/core-bundle@^0.1.0'],
    flags: [
      { name: 'product', type: 'string', required: true, description: 'Product ID' },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' },
      { name: 'yaml', type: 'boolean' }
    ],
    examples: [
      'kb config get --product aiReview',
      'kb config get --product devlink --json'
    ],
    loader: async () => import('../cli/config/get'),
  },
  {
    manifestVersion: '1.0',
    id: 'config:inspect',
    group: 'config',
    describe: 'Inspect product configuration (summary + validation)',
    requires: ['@kb-labs/core-bundle@^0.1.0'],
    flags: [
      { name: 'product', type: 'string', required: true },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb config inspect --product aiReview'],
    loader: async () => import('../cli/config/inspect'),
  },
  {
    manifestVersion: '1.0',
    id: 'config:validate',
    group: 'config',
    describe: 'Validate product configuration against schemas',
    requires: ['@kb-labs/core-bundle@^0.1.0'],
    flags: [
      { name: 'product', type: 'string', required: true, description: 'Product ID' },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'no-fail', type: 'boolean', description: 'Warn instead of failing' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: [
      'kb config validate --product aiReview',
      'kb config validate --product devlink --no-fail',
    ],
    loader: async () => import('../cli/config/validate'),
  },
  {
    manifestVersion: '1.0',
    id: 'config:explain',
    group: 'config',
    describe: 'Explain configuration resolution',
    requires: ['@kb-labs/core-bundle@^0.1.0'],
    flags: [
      { name: 'product', type: 'string', required: true },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb config explain --product aiReview'],
    loader: async () => import('../cli/config/explain'),
  },
  {
    manifestVersion: '1.0',
    id: 'config:doctor',
    aliases: ['doctor'],
    group: 'config',
    describe: 'Check configuration health and get suggestions',
    flags: [
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' },
      { name: 'fix', type: 'boolean', description: 'Auto-fix issues' }
    ],
    examples: ['kb config doctor', 'kb doctor', 'kb doctor --fix'],
    loader: async () => import('../cli/config/doctor'),
  },
];

