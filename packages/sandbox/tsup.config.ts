import { defineConfig } from 'tsup'
import nodePreset from '@kb-labs/devkit/tsup/node.js'

export default defineConfig({
  ...nodePreset,
  entry: {
    index: 'src/index.ts',
    'runner/bootstrap': 'src/runner/bootstrap.ts', // Bootstrap for subprocess runner
  },
  external: [/^@kb-labs\//],
  skipNodeModulesBundle: true,
})

