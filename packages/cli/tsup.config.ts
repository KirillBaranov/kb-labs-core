import { defineConfig } from 'tsup'
import nodePreset from '@kb-labs/devkit/tsup/node.js'

export default defineConfig({
  ...nodePreset,
  entry: ['src/index.ts', 'src/cli.manifest.ts'],
  external: [/^@kb-labs\//],
  dts: {
    resolve: false,
  },
  skipNodeModulesBundle: true,
})

