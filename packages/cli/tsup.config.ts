import { defineConfig } from 'tsup'
import nodePreset from '@kb-labs/devkit/tsup/node.js'

export default defineConfig({
  ...nodePreset,
  entry: ['src/index.ts', 'src/cli.manifest.ts'],
  external: ['@kb-labs/core-bundle', '@kb-labs/core-config', '@kb-labs/core-policy', '@kb-labs/core-profiles'],
  dts: {
    resolve: true,
  },
})

