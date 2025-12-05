/**
 * @module @kb-labs/core-cli/manifest
 * Manifest v2 for Core CLI
 */

import { defineManifest } from '@kb-labs/shared-command-kit';
import { pluginContractsManifest } from '@kb-labs/core-contracts';

/**
 * Core CLI Manifest v2
 * Level 2: Типизация через contracts для автодополнения и проверки ID
 */
// TODO: Fix type-safe manifest generation - for now use loose typing
export const manifest = defineManifest({
  schema: 'kb.plugin/2',
  id: '@kb-labs/core',
  version: '0.1.0',
  display: {
    name: 'KB Labs Core',
    description: 'Core CLI commands for KB Labs configuration system',
    tags: ['core', 'config', 'profiles', 'bundle'],
  },
  
  // CLI commands
  cli: {
    commands: [
      // INIT commands
      {
        id: 'workspace',
        group: 'init',
        describe: 'Initialize workspace configuration',
        flags: [
          { name: 'format', type: 'string', choices: ['yaml', 'json'], default: 'yaml' },
          { name: 'force', type: 'boolean', alias: 'f' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb init workspace',
          'kb init workspace --format json',
        ],
        handler: './cli/init/workspace.js#run',
      },
      {
        id: 'policy',
        group: 'init',
        describe: 'Initialize policy configuration',
        flags: [
          { name: 'bundle-name', type: 'string', default: 'default' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb init policy',
        ],
        handler: './cli/init/policy.js#run',
      },
      {
        id: 'setup',
        group: 'init',
        describe: 'Initialize complete KB Labs workspace',
        longDescription: 'Setup workspace with config, profile, and policy in one command',
        flags: [
          { name: 'format', type: 'string', choices: ['yaml', 'json'], default: 'yaml' },
          { name: 'products', type: 'string', description: 'Comma-separated product list', default: 'aiReview' },
          { name: 'preset-ref', type: 'string' },
          { name: 'policy-bundle', type: 'string' },
          { name: 'dry-run', type: 'boolean' },
          { name: 'force', type: 'boolean', alias: 'f' },
          { name: 'yes', type: 'boolean', alias: 'y' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb init',
          'kb init setup --yes',
          'kb init setup --products aiReview,devlink --dry-run',
        ],
        handler: './cli/init/setup.js#run',
      },
      
      // CONFIG commands
      {
        id: 'get',
        group: 'config',
        describe: 'Get product configuration',
        flags: [
          { name: 'product', type: 'string', required: true, description: 'Product ID' },
          { name: 'profile', type: 'string', description: 'Profile ID (Profiles v2)' },
          { name: 'scope', type: 'string', description: 'Scope ID within profile' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
          { name: 'yaml', type: 'boolean' },
        ],
        examples: [
          'kb config get --product aiReview',
          'kb config get --product devlink --json',
        ],
        handler: './cli/config/get.js#run',
      },
      {
        id: 'inspect',
        group: 'config',
        describe: 'Inspect product configuration (summary + validation)',
        flags: [
          { name: 'product', type: 'string', required: true },
          { name: 'profile', type: 'string', description: 'Profile ID (Profiles v2)' },
          { name: 'scope', type: 'string', description: 'Scope ID within profile' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb config inspect --product aiReview',
        ],
        handler: './cli/config/inspect.js#run',
      },
      {
        id: 'validate',
        group: 'config',
        describe: 'Validate product configuration against schemas',
        flags: [
          { name: 'product', type: 'string', required: true, description: 'Product ID' },
          { name: 'profile', type: 'string', description: 'Profile ID (Profiles v2)' },
          { name: 'scope', type: 'string', description: 'Scope ID within profile' },
          { name: 'no-fail', type: 'boolean', description: 'Warn instead of failing' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb config validate --product aiReview',
          'kb config validate --product devlink --no-fail',
        ],
        handler: './cli/config/validate.js#run',
      },
      {
        id: 'explain',
        group: 'config',
        describe: 'Explain configuration resolution',
        flags: [
          { name: 'product', type: 'string', required: true },
          { name: 'profile', type: 'string', description: 'Profile ID (Profiles v2)' },
          { name: 'scope', type: 'string', description: 'Scope ID within profile' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb config explain --product aiReview',
        ],
        handler: './cli/config/explain.js#run',
      },
      {
        id: 'doctor',
        group: 'config',
        describe: 'Check configuration health and get suggestions',
        flags: [
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
          { name: 'fix', type: 'boolean', description: 'Auto-fix issues' },
        ],
        examples: [
          'kb config doctor',
          'kb doctor',
          'kb doctor --fix',
        ],
        handler: './cli/config/doctor.js#run',
      },
      
      // PROFILES commands
      {
        id: 'inspect',
        group: 'profiles',
        describe: 'Inspect profile configuration (Profiles v2)',
        flags: [
          { name: 'profile', type: 'string', description: 'Profile ID to inspect' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb profiles inspect --profile default',
          'kb profiles inspect --profile frontend',
          'kb profiles inspect --profile production --json',
        ],
        handler: './cli/profiles/inspect.js#run',
      },
      {
        id: 'resolve',
        group: 'profiles',
        describe: 'Resolve and display profile configuration (Profiles v2)',
        flags: [
          { name: 'profile', type: 'string', description: 'Profile ID to resolve' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb profiles resolve --profile default',
          'kb profiles resolve --profile frontend --json',
        ],
        handler: './cli/profiles/resolve.js#run',
      },
      {
        id: 'validate',
        group: 'profiles',
        describe: 'Validate profile configuration (Profiles v2)',
        flags: [
          { name: 'profile', type: 'string', description: 'Profile ID to validate' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb profiles validate --profile default',
          'kb profiles validate --profile production --json',
        ],
        handler: './cli/profiles/validate.js#run',
      },
      
      // BUNDLE commands
      {
        id: 'print',
        group: 'bundle',
        describe: 'Print complete bundle for product',
        flags: [
          { name: 'product', type: 'string', required: true },
          { name: 'profile', type: 'string', description: 'Profile ID (Profiles v2)' },
          { name: 'scope', type: 'string', description: 'Scope ID within profile' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
          { name: 'with-trace', type: 'boolean' },
        ],
        examples: [
          'kb bundle print --product aiReview',
          'kb bundle print --product aiReview --profile frontend',
          'kb bundle print --product aiReview --profile frontend --scope backend --with-trace',
        ],
        handler: './cli/bundle/print.js#run',
      },
      {
        id: 'inspect',
        group: 'bundle',
        describe: 'Inspect bundle (profile + config + artifacts + trace)',
        flags: [
          { name: 'product', type: 'string', required: true },
          { name: 'profile', type: 'string', description: 'Profile ID (Profiles v2)' },
          { name: 'scope', type: 'string', description: 'Scope ID within profile' },
          { name: 'trace', type: 'boolean' },
          { name: 'cwd', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
        examples: [
          'kb bundle inspect --product aiReview',
          'kb bundle inspect --product aiReview --profile frontend --trace',
          'kb bundle inspect --product aiReview --profile frontend --scope backend',
        ],
        handler: './cli/bundle/inspect.js#run',
      },
    ],
  },
  
  // Setup handler
  setup: {
    handler: './setup/handler.js#run',
    describe: 'Create basic .kb directory structure and initial files.',
    permissions: {
      fs: {
        mode: 'readWrite',
        allow: ['.kb/**', 'kb-labs.config.*', 'kb.config.*'],
        deny: ['node_modules/**', '.git/**'],
      },
      net: 'none',
      env: {
        allow: ['NODE_ENV'],
      },
      quotas: {
        timeoutMs: 5000,
        memoryMb: 64,
        cpuMs: 2500,
      },
      capabilities: ['fs:read', 'fs:write'],
    },
  },
  
  // No REST, Studio, or artifacts for core CLI (core is CLI-only)
  permissions: {
    fs: {
      mode: 'readWrite',
      allow: ['.kb/**', 'kb-labs.config.*', 'kb.config.*'],
      deny: ['node_modules/**', '.git/**'],
    },
    net: 'none',
    env: {
      allow: ['NODE_ENV', 'KB_LABS_*'],
    },
    quotas: {
      timeoutMs: 30000,
      memoryMb: 256,
      cpuMs: 10000,
    },
    capabilities: [],
  },
  artifacts: [],
});

export default manifest;

