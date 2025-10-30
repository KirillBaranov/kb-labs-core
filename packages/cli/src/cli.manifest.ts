/**
 * Core CLI manifest for KB Labs configuration system
 * 
 * This manifest aggregates commands from separate group manifest files
 * for better organization and maintainability.
 */

import type { CommandManifest } from './cli/types';

// Import commands from organized group manifests
import { initCommands } from './manifests/init';
import { configCommands } from './manifests/config';
import { bundleCommands } from './manifests/bundle';
import { profilesCommands } from './manifests/profiles';

/**
 * Aggregate all CLI commands from group manifests
 */
export const commands: CommandManifest[] = [
  ...initCommands,
  ...configCommands,
  ...bundleCommands,
  ...profilesCommands,
];

