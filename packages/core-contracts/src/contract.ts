import type { PluginContracts } from './types.js';
import { contractsSchemaId, contractsVersion } from './version.js';

/**
 * Core plugin contracts manifest
 * Level 2: Contracts типизация с as const для извлечения типов
 * 
 * Note: Core CLI использует команды без префикса 'core:', они используют группы (init, config, profiles, bundle)
 */
export const pluginContractsManifest = {
  schema: contractsSchemaId,
  pluginId: '@kb-labs/core',
  contractsVersion,
  artifacts: {},
  commands: {
    'init:workspace': {
      id: 'init:workspace',
      description: 'Initialize workspace configuration',
      examples: [
        'kb init workspace',
        'kb init workspace --format json',
      ],
    },
    'init:policy': {
      id: 'init:policy',
      description: 'Initialize policy configuration',
      examples: ['kb init policy'],
    },
    'init:setup': {
      id: 'init:setup',
      description: 'Initialize setup configuration',
      examples: ['kb init setup'],
    },
    'config:get': {
      id: 'config:get',
      description: 'Get configuration value',
      examples: ['kb config get key'],
    },
    'config:inspect': {
      id: 'config:inspect',
      description: 'Inspect configuration',
      examples: ['kb config inspect'],
    },
    'config:validate': {
      id: 'config:validate',
      description: 'Validate configuration',
      examples: ['kb config validate'],
    },
    'config:explain': {
      id: 'config:explain',
      description: 'Explain configuration',
      examples: ['kb config explain'],
    },
    'config:doctor': {
      id: 'config:doctor',
      description: 'Diagnose configuration issues',
      examples: ['kb config doctor'],
    },
    'profiles:inspect': {
      id: 'profiles:inspect',
      description: 'Inspect profile',
      examples: ['kb profiles inspect'],
    },
    'profiles:resolve': {
      id: 'profiles:resolve',
      description: 'Resolve profile',
      examples: ['kb profiles resolve'],
    },
    'profiles:validate': {
      id: 'profiles:validate',
      description: 'Validate profile',
      examples: ['kb profiles validate'],
    },
    'bundle:print': {
      id: 'bundle:print',
      description: 'Print bundle',
      examples: ['kb bundle print'],
    },
    'bundle:inspect': {
      id: 'bundle:inspect',
      description: 'Inspect bundle',
      examples: ['kb bundle inspect'],
    },
  },
} as const satisfies PluginContracts;

// Извлекаем типы для использования в других местах
export type PluginArtifactIds = keyof typeof pluginContractsManifest.artifacts;
export type PluginCommandIds = keyof typeof pluginContractsManifest.commands;

