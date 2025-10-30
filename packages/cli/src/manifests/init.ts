import type { CommandManifest } from '../cli/types';

/**
 * Init group commands
 */
export const initCommands: CommandManifest[] = [
  {
    manifestVersion: '1.0',
    id: 'init:workspace',
    group: 'init',
    describe: 'Initialize workspace configuration',
    requires: ['@kb-labs/core-config@^0.1.0'],
    flags: [
      { name: 'format', type: 'string', choices: ['yaml', 'json'], default: 'yaml' },
      { name: 'force', type: 'boolean', alias: 'f' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb init workspace', 'kb init workspace --format json'],
    loader: async () => import('../cli/init/workspace'),
  },
  {
    manifestVersion: '1.0',
    id: 'init:profile',
    group: 'init',
    describe: 'Initialize or link a profile',
    requires: ['@kb-labs/core-profiles@^0.1.0'],
    flags: [
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'profile-ref', type: 'string' },
      { name: 'scaffold-local-profile', type: 'boolean' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb init profile', 'kb init profile --scaffold-local-profile'],
    loader: async () => import('../cli/init/profile'),
  },
  {
    manifestVersion: '1.0',
    id: 'init:policy',
    group: 'init',
    describe: 'Initialize policy configuration',
    requires: ['@kb-labs/core-policy@^0.1.0'],
    flags: [
      { name: 'bundle-name', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb init policy'],
    loader: async () => import('../cli/init/policy'),
  },
  {
    manifestVersion: '1.0',
    id: 'init:setup',
    aliases: ['init'],
    group: 'init',
    describe: 'Initialize complete KB Labs workspace',
    longDescription: 'Setup workspace with config, profile, and policy in one command',
    requires: ['@kb-labs/core-bundle@^0.1.0'],
    flags: [
      { name: 'format', type: 'string', choices: ['yaml', 'json'], default: 'yaml' },
      { name: 'products', type: 'string', description: 'Comma-separated product list', default: 'aiReview' },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'profile-ref', type: 'string' },
      { name: 'scaffold-local-profile', type: 'boolean' },
      { name: 'preset-ref', type: 'string' },
      { name: 'policy-bundle', type: 'string' },
      { name: 'dry-run', type: 'boolean' },
      { name: 'force', type: 'boolean', alias: 'f' },
      { name: 'yes', type: 'boolean', alias: 'y' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: [
      'kb init',
      'kb init setup --yes',
      'kb init setup --products aiReview,devlink --dry-run'
    ],
    loader: async () => import('../cli/init/setup'),
  },
];

