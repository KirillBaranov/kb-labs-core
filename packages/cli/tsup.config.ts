import { defineConfig } from 'tsup'
import nodePreset from '@kb-labs/devkit/tsup/node.js'

export default defineConfig({
  ...nodePreset,
  entry: [
    'src/index.ts',
    'src/manifest.v2.ts',
    // CLI command handlers
    'src/cli/init/workspace.ts',
    'src/cli/init/policy.ts',
    'src/cli/init/setup.ts',
    'src/cli/config/get.ts',
    'src/cli/config/inspect.ts',
    'src/cli/config/validate.ts',
    'src/cli/config/explain.ts',
    'src/cli/config/doctor.ts',
    'src/cli/profiles/inspect.ts',
    'src/cli/profiles/resolve.ts',
    'src/cli/profiles/validate.ts',
    'src/cli/bundle/print.ts',
    'src/cli/bundle/inspect.ts',
  ],
  tsconfig: "tsconfig.build.json", // Use build-specific tsconfig without paths
  // nodePreset already includes all workspace packages as external via tsup.external.json
  dts: {
    resolve: true,
    skipLibCheck: true,
  },
})

