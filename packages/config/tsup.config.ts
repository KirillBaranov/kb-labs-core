import { defineConfig } from 'tsup'
import nodePreset from '@kb-labs/devkit/tsup/node.js'

export default defineConfig({
  ...nodePreset,
  entry: {
    index: 'src/index.ts',
  },
  external: [/^@kb-labs\//, 'ajv', 'ajv-formats', 'yaml', 'picomatch'],
  // Disable DTS to avoid circular type generation with @kb-labs/core-profiles
  dts: false,
  skipNodeModulesBundle: true,
})
