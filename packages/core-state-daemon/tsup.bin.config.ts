import { defineConfig } from 'tsup';
import binPreset from '@kb-labs/devkit/tsup/bin.js';

export default defineConfig({
  ...binPreset,
  tsconfig: "tsconfig.build.json",
  entry: {
    bin: 'src/bin.ts',
  },
});
