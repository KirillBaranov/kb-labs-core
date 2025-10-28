/**
 * Core CLI manifest for KB Labs
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
  // Profiles commands
  {
    manifestVersion: '1.0',
    id: 'profiles:init',
    group: 'profiles',
    describe: 'Initialize or link a profile',
    longDescription: 'Initialize a new profile or link an existing one',
    requires: ['@kb-labs/core-profiles'],
    flags: [
      { name: 'profile-key', type: 'string', description: 'Profile key', default: 'default' },
      { name: 'scaffold-local-profile', type: 'boolean', description: 'Create local profile scaffold' }
    ],
    examples: ['kb profiles init', 'kb profiles init --profile-key custom'],
    loader: async () => import('./cli/profiles/init'),
  },
  {
    manifestVersion: '1.0',
    id: 'profiles:resolve',
    group: 'profiles',
    describe: 'Resolve and display profile configuration',
    requires: ['@kb-labs/core-profiles'],
    flags: [
      { name: 'profile', type: 'string', alias: 'p', description: 'Profile name', default: 'default' }
    ],
    examples: ['kb profiles resolve', 'kb profiles resolve --profile dev'],
    loader: async () => import('./cli/profiles/resolve'),
  },
  {
    manifestVersion: '1.0',
    id: 'profiles:validate',
    group: 'profiles',
    describe: 'Validate profile configuration',
    requires: ['@kb-labs/core-profiles'],
    examples: ['kb profiles validate'],
    loader: async () => import('./cli/profiles/validate'),
  },
  
  // Bundle commands
  {
    manifestVersion: '1.0',
    id: 'bundle:print',
    group: 'bundle',
    describe: 'Print bundle configuration for a product',
    requires: ['@kb-labs/core-bundle'],
    flags: [
      { name: 'product', type: 'string', description: 'Product name', required: true }
    ],
    examples: ['kb bundle print --product aiReview'],
    loader: async () => import('./cli/bundle/print'),
  },
  {
    manifestVersion: '1.0',
    id: 'bundle:explain',
    group: 'bundle',
    describe: 'Explain how bundle configuration is resolved',
    requires: ['@kb-labs/core-bundle'],
    flags: [
      { name: 'product', type: 'string', description: 'Product name', required: true }
    ],
    examples: ['kb bundle explain --product aiReview'],
    loader: async () => import('./cli/bundle/explain'),
  },
  
  // Init commands
  {
    manifestVersion: '1.0',
    id: 'init:workspace',
    group: 'init',
    describe: 'Initialize workspace configuration file',
    requires: ['@kb-labs/core-config'],
    flags: [
      { name: 'format', type: 'string', choices: ['yaml', 'json'], default: 'yaml' },
      { name: 'force', type: 'boolean', alias: 'f', description: 'Overwrite existing config' }
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
    examples: ['kb init profile'],
    loader: async () => import('./cli/init/profile'),
  },
  {
    manifestVersion: '1.0',
    id: 'init:policy',
    group: 'init',
    describe: 'Add policy scaffold to workspace config',
    requires: ['@kb-labs/core-policy'],
    examples: ['kb init policy'],
    loader: async () => import('./cli/init/policy'),
  },
  {
    manifestVersion: '1.0',
    id: 'init:setup',
    group: 'init',
    describe: 'Initialize complete KB Labs workspace',
    longDescription: 'Setup complete KB Labs workspace with config, profile, and products',
    requires: ['@kb-labs/core-config', '@kb-labs/core-profiles', '@kb-labs/core-policy'],
    flags: [
      { name: 'yes', type: 'boolean', alias: 'y', description: 'Use defaults without prompts' },
      { name: 'dry-run', type: 'boolean', description: 'Preview changes without writing' },
      { name: 'force', type: 'boolean', alias: 'f', description: 'Overwrite existing files' }
    ],
    examples: ['kb init setup --yes', 'kb init setup --dry-run'],
    loader: async () => import('./cli/init/setup'),
  },
  
  // Policy commands
  {
    manifestVersion: '1.0',
    id: 'policy:validate',
    group: 'policy',
    describe: 'Validate policy configuration',
    requires: ['@kb-labs/core-policy'],
    examples: ['kb policy validate'],
    loader: async () => import('./cli/policy/validate'),
  },
  {
    manifestVersion: '1.0',
    id: 'policy:explain',
    group: 'policy',
    describe: 'Explain policy rules and resolution',
    requires: ['@kb-labs/core-policy'],
    flags: [
      { name: 'rule', type: 'string', description: 'Specific rule to explain' }
    ],
    examples: ['kb policy explain', 'kb policy explain --rule no-console'],
    loader: async () => import('./cli/policy/explain'),
  }
];

