/**
 * @module @kb-labs/sandbox/factory
 * Factory for creating sandbox runners
 */

import type { SandboxConfig } from './types/index.js';
import type { SandboxRunner } from './runner/sandbox-runner.js';
import { createInProcessRunner } from './runner/inprocess-runner.js';
import { createSubprocessRunner } from './runner/subprocess-runner.js';

/**
 * Create a sandbox runner based on configuration
 * @param config - Sandbox configuration
 * @returns Configured sandbox runner
 */
export function createSandboxRunner(config: SandboxConfig): SandboxRunner {
  // Dev mode always uses in-process
  if (config.devMode || process.env.KB_PLUGIN_DEV_MODE === 'true') {
    return createInProcessRunner();
  }

  // Choose runner based on mode
  switch (config.mode) {
    case 'inprocess':
      return createInProcessRunner();
    case 'subprocess':
      return createSubprocessRunner(config);
    default:
      throw new Error(`Unknown sandbox mode: ${config.mode}`);
  }
}

