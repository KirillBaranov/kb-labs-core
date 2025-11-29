import { defineConfig } from 'tsup'
import nodePreset from '@kb-labs/devkit/tsup/node.js'

export default defineConfig({
  ...nodePreset,
  entry: {
    index: 'src/index.ts',
  },
  tsconfig: "tsconfig.build.json", // Use build-specific tsconfig without paths
  dts: false, // Disabled for OOM debugging
  // nodePreset already includes all workspace packages as external via tsup.external.json
})
