/**
 * Core CLI manifest for KB Labs configuration system
 */

// Local type definition to avoid external dependencies
type CommandManifest = {
  manifestVersion: '1.0';
  id: string;
  aliases?: string[];
  group: string;
  describe: string;
  longDescription?: string;
  requires?: string[];
  flags?: FlagDefinition[];
  examples?: string[];
  loader: () => Promise<{ run: any }>;
};

type FlagDefinition = {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'array';
  alias?: string;
  default?: any;
  description?: string;
  choices?: string[];
  required?: boolean;
};

export const commands: CommandManifest[] = [
  // init group
  {
    manifestVersion: '1.0',
    id: 'init:workspace',
    group: 'init',
    describe: 'Initialize workspace configuration',
    requires: ['@kb-labs/core-config'],
    flags: [
      { name: 'format', type: 'string', choices: ['yaml', 'json'], default: 'yaml' },
      { name: 'force', type: 'boolean', alias: 'f' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb init workspace', 'kb init workspace --format json'],
    loader: async () => import('./cli/init/workspace'),
  },
  {
    manifestVersion: '1.0',
    id: 'init:profile',
    group: 'init',
    describe: 'Initialize or link a profile',
    requires: ['@kb-labs/core-profiles'],
    flags: [
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'profile-ref', type: 'string' },
      { name: 'scaffold-local-profile', type: 'boolean' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb init profile', 'kb init profile --scaffold-local-profile'],
    loader: async () => import('./cli/init/profile'),
  },
  {
    manifestVersion: '1.0',
    id: 'init:policy',
    group: 'init',
    describe: 'Initialize policy configuration',
    requires: ['@kb-labs/core-policy'],
    flags: [
      { name: 'bundle-name', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb init policy'],
    loader: async () => import('./cli/init/policy'),
  },
  {
    manifestVersion: '1.0',
    id: 'init:setup',
    aliases: ['init'],
    group: 'init',
    describe: 'Initialize complete KB Labs workspace',
    longDescription: 'Setup workspace with config, profile, and policy in one command',
    requires: ['@kb-labs/core-bundle'],
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
    loader: async () => import('./cli/init/setup'),
  },
  
  // config group
  {
    manifestVersion: '1.0',
    id: 'config:get',
    group: 'config',
    describe: 'Get product configuration',
    requires: ['@kb-labs/core-bundle'],
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
    loader: async () => import('./cli/config/get'),
  },
  {
    manifestVersion: '1.0',
    id: 'config:inspect',
    group: 'config',
    describe: 'Inspect product configuration (summary + validation)',
    requires: ['@kb-labs/core-bundle'],
    flags: [
      { name: 'product', type: 'string', required: true },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb config inspect --product aiReview'],
    loader: async () => import('./cli/config/inspect'),
  },
  {
    manifestVersion: '1.0',
    id: 'config:validate',
    group: 'config',
    describe: 'Validate product configuration against schemas',
    requires: ['@kb-labs/core-bundle'],
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
    loader: async () => import('./cli/config/validate'),
  },
  {
    manifestVersion: '1.0',
    id: 'config:explain',
    group: 'config',
    describe: 'Explain configuration resolution',
    requires: ['@kb-labs/core-bundle'],
    flags: [
      { name: 'product', type: 'string', required: true },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb config explain --product aiReview'],
    loader: async () => import('./cli/config/explain'),
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
    loader: async () => import('./cli/config/doctor'),
  },
  
  // bundle group
  {
    manifestVersion: '1.0',
    id: 'bundle:print',
    group: 'bundle',
    describe: 'Print complete bundle for product',
    requires: ['@kb-labs/core-bundle'],
    flags: [
      { name: 'product', type: 'string', required: true },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' },
      { name: 'with-trace', type: 'boolean' }
    ],
    examples: [
      'kb bundle print --product aiReview',
      'kb bundle print --product devlink --with-trace'
    ],
    loader: async () => import('./cli/bundle/print'),
  },
  {
    manifestVersion: '1.0',
    id: 'bundle:inspect',
    group: 'bundle',
    describe: 'Inspect bundle (profile + config + artifacts + trace)',
    requires: ['@kb-labs/core-bundle'],
    flags: [
      { name: 'product', type: 'string', required: true },
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'trace', type: 'boolean' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb bundle inspect --product aiReview --trace'],
    loader: async () => import('./cli/bundle/inspect'),
  },
  
  // profiles group  
  {
    manifestVersion: '1.0',
    id: 'profiles:resolve',
    group: 'profiles',
    describe: 'Resolve and display profile configuration',
    requires: ['@kb-labs/core-profiles'],
    flags: [
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: ['kb profiles resolve', 'kb profiles resolve --profile-key production'],
    loader: async () => import('./cli/profiles/resolve'),
  },
  {
    manifestVersion: '1.0',
    id: 'profiles:validate',
    group: 'profiles',
    describe: 'Validate profile manifest (legacy and v1.0)',
    requires: ['@kb-labs/core-profiles'],
    flags: [
      { name: 'profile-key', type: 'string', default: 'default' },
      { name: 'cwd', type: 'string' },
      { name: 'json', type: 'boolean' }
    ],
    examples: [
      'kb profiles validate',
      'kb profiles validate --profile-key production --json'
    ],
    loader: async () => import('./cli/profiles/validate'),
  },
];

