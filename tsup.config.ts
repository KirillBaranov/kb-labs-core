import { defineConfig } from 'tsup'
import nodePreset from '@kb-labs/devkit/tsup/node.js'

export default defineConfig({
  ...nodePreset,
  entry: {
    index: 'src/index.ts',
  },
  external: ['ajv', 'ajv-formats', 'yaml', 'picomatch', '@kb-labs/profile-schemas', '@kb-labs/profile-schemas/*'],
  tsconfig: 'tsconfig.base.json'
})
