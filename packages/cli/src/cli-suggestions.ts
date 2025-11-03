/**
 * Core CLI suggestions integration
 */

import { 
  MultiCLISuggestions
} from '@kb-labs/shared-cli-ui';
import { commands } from './cli.manifest.js';

/**
 * Create a core CLI suggestions manager
 */
export function createCoreCLISuggestions(): MultiCLISuggestions {
  const manager = new MultiCLISuggestions();
  
  // Register init commands
  manager.registerPackage({
    name: 'core-init',
    group: 'init',
    commands: commands.filter(c => c.group === 'init'),
    priority: 100  // High priority for init commands
  });
  
  // Register config commands
  manager.registerPackage({
    name: 'core-config',
    group: 'config',
    commands: commands.filter(c => c.group === 'config'),
    priority: 90
  });
  
  // Register bundle commands
  manager.registerPackage({
    name: 'core-bundle',
    group: 'bundle',
    commands: commands.filter(c => c.group === 'bundle'),
    priority: 85
  });
  
  // Register profiles commands
  manager.registerPackage({
    name: 'core-profiles',
    group: 'profiles',
    commands: commands.filter(c => c.group === 'profiles'),
    priority: 85
  });

  return manager;
}

/**
 * Get all available core commands
 */
export function getCoreCommands(): string[] {
  return commands.map(cmd => cmd.id);
}

