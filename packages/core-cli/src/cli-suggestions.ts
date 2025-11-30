/**
 * Core CLI suggestions integration
 */

import { 
  MultiCLISuggestions,
  type CommandManifest
} from '@kb-labs/shared-cli-ui';
import { manifest } from './manifest.v2';

/**
 * Convert ManifestV2 commands to CommandManifest format
 */
function convertCommandsToManifest(commands: NonNullable<typeof manifest.cli>['commands']): CommandManifest[] {
  return commands
    .filter(cmd => cmd.group) // Filter out commands without group
    .map(cmd => ({
      manifestVersion: cmd.manifestVersion ?? '1.0',
      id: cmd.id,
      group: cmd.group!, // Non-null assertion since we filtered above
      describe: cmd.describe,
      longDescription: cmd.longDescription,
      // Convert CliFlagDecl[] to FlagDefinition[]
      // Types are compatible, but explicit conversion ensures type safety
      flags: cmd.flags?.map(flag => ({
        name: flag.name,
        type: flag.type,
        alias: flag.alias,
        default: flag.default,
        description: flag.description,
        choices: flag.choices,
        required: flag.required,
      })) ?? [],
      examples: cmd.examples,
      loader: async () => {
        // For suggestions, we don't need to actually load the handler
        // Just return a placeholder
        return { run: async () => 0 };
      }
    }));
}

/**
 * Create a core CLI suggestions manager
 */
export function createCoreCLISuggestions(): MultiCLISuggestions {
  const manager = new MultiCLISuggestions();
  const commands = manifest.cli?.commands ?? [];
  const commandManifests = convertCommandsToManifest(commands);
  
  // Register init commands
  manager.registerPackage({
    name: 'core-init',
    group: 'init',
    commands: commandManifests.filter(c => c.group === 'init'),
    priority: 100  // High priority for init commands
  });
  
  // Register config commands
  manager.registerPackage({
    name: 'core-config',
    group: 'config',
    commands: commandManifests.filter(c => c.group === 'config'),
    priority: 90
  });
  
  // Register bundle commands
  manager.registerPackage({
    name: 'core-bundle',
    group: 'bundle',
    commands: commandManifests.filter(c => c.group === 'bundle'),
    priority: 85
  });
  
  // Register profiles commands
  manager.registerPackage({
    name: 'core-profiles',
    group: 'profiles',
    commands: commandManifests.filter(c => c.group === 'profiles'),
    priority: 85
  });

  return manager;
}

/**
 * Get all available core commands
 */
export function getCoreCommands(): string[] {
  const commands = manifest.cli?.commands ?? [];
  return commands.map(cmd => cmd.id);
}

