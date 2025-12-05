// Export manifest
export { manifest } from './manifest.v2';
// Keep manifest types internal; public contracts must come from *-contracts.

export * from './application/index';
export * from './domain/index';
export * from './shared/index';
export * from './infra/index';
export * from './cli/index';

// Export CLI utilities if needed
export { createCoreCLISuggestions } from './cli-suggestions';

