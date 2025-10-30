import { defineConfig } from 'tsup'
import nodePreset from '@kb-labs/devkit/tsup/node.js'

export default defineConfig([
  // Build manifest only (lightweight, no loader code)
  {
    ...nodePreset,
    entry: ['src/cli.manifest.ts'],
    format: ['esm'],
    dts: true,
    external: [
      /^@kb-labs\//,
      // Don't bundle any loader functions - keep them external
      /\.\/cli\//,
    ],
  },
  // Build index separately (can include suggestions code)
  {
    ...nodePreset,
    entry: ['src/index.ts'],
    external: [/^@kb-labs\//],
  }
])

