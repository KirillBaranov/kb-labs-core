import { defineConfig } from 'tsup';
import nodePreset from '@kb-labs/devkit/tsup/node.js';

export default defineConfig({
  ...nodePreset,
  entry: ['src/index.ts'],
  // core-platform is workspace dependency, mark as external for DTS build
  // Include all subpaths (/, /serializable)
  external: [/^@kb-labs\/core-platform/],
});
