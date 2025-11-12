import { defineConfig } from 'tsup';
import nodePreset from '@kb-labs/devkit/tsup/node.js';

export default defineConfig({
  ...nodePreset,
  entry: {
    index: 'src/index.ts',
    public: 'src/public/index.ts',
  },
  external: [/^@kb-labs\//, 'colorette', 'semver', 'chokidar', 'glob', 'yaml', 'zod'],
  skipNodeModulesBundle: true,
});
