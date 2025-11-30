/**
 * @module @kb-labs/core-profiles/defaults/system-defaults
 * System defaults for profiles
 */

import type { IOPolicy, DiffPolicy, Capabilities } from "../types";

/**
 * Default IO policy
 */
export const defaultIO: IOPolicy = {
  allow: [],
  deny: [],
  maxBytesPerFile: undefined,
  maxFiles: undefined,
  followSymlinks: false
};

/**
 * Default diff policy
 */
export const defaultDiff: DiffPolicy = {
  include: [],
  exclude: []
};

/**
 * Default capabilities
 */
export const defaultCapabilities: Capabilities = {
  rag: false,
  internet: false,
  writeFs: false,
  tools: []
};

/**
 * System defaults collection
 */
export const SYSTEM_DEFAULTS = {
  io: defaultIO,
  diff: defaultDiff,
  capabilities: defaultCapabilities
} as const;
