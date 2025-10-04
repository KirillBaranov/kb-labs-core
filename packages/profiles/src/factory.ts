/**
 * @module @kb-labs/core-profiles/factory
 * Factory functions for creating ProfileService from configuration
 */

import { ProfileService } from './api/profile-service';

export type ProfilesCfg = import('@kb-labs/core-config').ProfilesConfig;

/**
 * Create ProfileService from profiles configuration
 * @param cfg Profiles configuration (optional)
 * @param cwd Working directory (defaults to process.cwd())
 * @returns ProfileService instance
 */
export function createProfileServiceFromConfig(
  cfg?: ProfilesCfg,
  cwd = process.cwd()
): ProfileService {
  // TODO: Use cfg.rootDir when implementing custom profile root directory support
  return new ProfileService({
    cwd,
    defaultName: cfg?.defaultName ?? 'default',
    strict: cfg?.strict ?? true
  });
}
