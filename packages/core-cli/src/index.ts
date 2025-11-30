// Export manifest
export { manifest } from './manifest.v2';
export type { ManifestV2 } from '@kb-labs/plugin-manifest';

export * from './application/index';
export * from './domain/index';
export * from './shared/index';
export * from './infra/index';
export * from './cli/index';

// Export CLI utilities if needed
export { createCoreCLISuggestions } from './cli-suggestions';

