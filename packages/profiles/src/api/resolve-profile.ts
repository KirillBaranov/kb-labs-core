/**
 * @module @kb-labs/core-profiles/resolve-profile
 * Profile resolution functionality with extends graph and validation
 */

import path from "node:path";
import { getLogger } from "@kb-labs/core-sys";
import { loadProfile } from "./load-profile";
import { validateProfile } from "./validate-profile";
import { mergeProfiles } from "./merge-profiles";
import { buildMeta } from "../meta/build-meta";
import { SYSTEM_DEFAULTS } from "../defaults/system-defaults";
import { ExtendResolutionError, SchemaValidationError } from "../errors";
import type { RawProfile, ResolvedProfile, ResolveOptions } from "../types";

/**
 * Resolve a profile with extends chain, validation and normalization
 * 
 * @param opts - Resolution options
 * @returns Promise resolving to the resolved profile
 * @throws SchemaValidationError if strict=true and validation fails
 */
export async function resolveProfile(opts: ResolveOptions = {}): Promise<ResolvedProfile> {
  const { cwd = process.cwd(), name = "default", product, strict = false } = opts;
  const logger = getLogger();
  const logLevel = process.env.KB_PROFILES_LOG_LEVEL || 'info';

  // Track timing for stages
  const startTime = performance.now();

  // Step 1: Load base profile
  const loadStartTime = performance.now();
  const loadResult = await loadProfile({ cwd, name });
  const profileData = loadResult.profile;
  const profileDir = path.dirname(loadResult.meta.pathAbs);
  const loadTime = performance.now() - loadStartTime;

  if (logLevel === 'debug') {
    logger.debug(`[ProfileResolver] Loading profile: ${name} from ${loadResult.meta.pathAbs}`);
  } else {
    logger.info(`Resolving profile: ${name} from ${loadResult.meta.pathAbs}`);
  }

  // Step 2: Build extends chain (left to right)
  const extendsChain: RawProfile[] = [];

  if (profileData.extends && Array.isArray(profileData.extends)) {
    for (const extendRef of profileData.extends) {
      if (typeof extendRef !== 'string') { continue; }

      try {
        let extendProfile: RawProfile;

        if (extendRef.startsWith('./') || extendRef.startsWith('../')) {
          // Relative path
          const extendPath = path.resolve(profileDir, extendRef);
          const extendResult = await loadProfile({ path: extendPath });
          extendProfile = extendResult.profile;
        } else if (extendRef.includes('@')) {
          // Package reference like @pkg@^1 - for now just warn
          logger.warn(`Package reference not yet implemented: ${extendRef}`);
          continue;
        } else {
          // Profile name in same directory
          const extendPath = path.join(profileDir, '..', extendRef, 'profile.json');
          const extendResult = await loadProfile({ path: extendPath });
          extendProfile = extendResult.profile;
        }

        extendsChain.push(extendProfile);
        logger.debug(`Loaded extends: ${extendRef}`);
      } catch (err) {
        logger.error(`Failed to load extends profile: ${extendRef}`, { error: err });
        if (strict) {
          throw new ExtendResolutionError(extendRef, err);
        }
      }
    }
  }

  // Step 3: Load overrides chain (left to right)
  const overridesChain: RawProfile[] = [];

  if (profileData.overrides && Array.isArray(profileData.overrides)) {
    for (const overrideRef of profileData.overrides) {
      if (typeof overrideRef !== 'string') { continue; }

      try {
        let overrideProfile: RawProfile;

        if (overrideRef.startsWith('./') || overrideRef.startsWith('../')) {
          // Relative path
          const overridePath = path.resolve(profileDir, overrideRef);
          const overrideResult = await loadProfile({ path: overridePath });
          overrideProfile = overrideResult.profile;
        } else {
          // Profile name in same directory
          const overridePath = path.join(profileDir, '..', overrideRef, 'profile.json');
          const overrideResult = await loadProfile({ path: overridePath });
          overrideProfile = overrideResult.profile;
        }

        overridesChain.push(overrideProfile);
        logger.debug(`Loaded override: ${overrideRef}`);
      } catch (err) {
        logger.warn(`Failed to load override profile: ${overrideRef}`, { error: err });
      }
    }
  }

  // Step 4: Merge chain: SYSTEM_DEFAULTS → extends (left→right) → local profile → overrides (left→right)
  const mergeStartTime = performance.now();
  const mergeChain = [SYSTEM_DEFAULTS, ...extendsChain, profileData, ...overridesChain];
  const merged = mergeProfiles(mergeChain);
  const mergeTime = performance.now() - mergeStartTime;

  if (logLevel === 'debug') {
    logger.debug(`[ProfileResolver] Merge chain: ${extendsChain.length} extends, 1 local, ${overridesChain.length} overrides`);
  }

  // Step 5: Normalize (apply defaults, sort keys, canonical paths)
  const normalized = normalizeProfile(merged);

  // Step 5.5: Apply system defaults to products
  const withDefaults = applySystemDefaultsToProducts(normalized);

  // Step 6: Validate final profile
  const validateStartTime = performance.now();
  const validationResult = validateProfile(withDefaults);
  const validateTime = performance.now() - validateStartTime;

  if (logLevel === 'debug') {
    logger.debug(`[ProfileResolver] Validation result: ${validationResult.ok ? 'PASS' : 'FAIL'} (${validateTime.toFixed(2)}ms)`);
  }

  if (!validationResult.ok) {
    if (strict) {
      throw new SchemaValidationError(validationResult.errors);
    } else {
      logger.warn(`Profile validation failed for ${name}`, { errors: validationResult.errors });
    }
  }

  // Step 7: Build ResolvedProfile
  const resolved: ResolvedProfile = {
    name: String(withDefaults.name ?? name),
    kind: (withDefaults.kind as any) ?? 'composite',
    scope: (withDefaults.scope as any) ?? 'repo',
    version: String(withDefaults.version ?? '0.0.0'),
    roots: [path.dirname(loadResult.meta.pathAbs)],
    files: [], // Will be populated later with mounted files
    products: (withDefaults.products as any) ?? {},
    rules: (withDefaults.rules as any[]) ?? [],
    meta: {
      ...(withDefaults.metadata as Record<string, unknown>),
      pathAbs: loadResult.meta.pathAbs,
      repoRoot: loadResult.meta.repoRoot,
      extendsChain: extendsChain.length,
      overridesChain: overridesChain.length,
      validationResult: validationResult.ok,
      extra: buildMeta({
        cwd,
        profilePathAbs: loadResult.meta.pathAbs,
        repoRoot: loadResult.meta.repoRoot,
        strict,
        logLevel,
        extendsChain: profileData.extends as string[] || [],
        overridesChain: profileData.overrides as string[] || [],
        files: [] // Will be populated later
      })
    }
  };

  // Update trace with timing information
  if (resolved.meta.extra) {
    resolved.meta.extra.trace.stages = {
      load: loadTime,
      merge: mergeTime,
      validate: validateTime
    };
  }

  const totalTime = performance.now() - startTime;
  if (logLevel === 'debug') {
    logger.debug(`[ProfileResolver] Resolved profile: ${resolved.name}/${resolved.kind} with ${Object.keys(resolved.products).length} products (${totalTime.toFixed(2)}ms total)`);
    logger.debug(`[ProfileResolver] Stage timings: load=${loadTime?.toFixed(2)}ms, merge=${mergeTime?.toFixed(2)}ms, validate=${validateTime?.toFixed(2)}ms`);
  } else {
    logger.info(`Resolved profile: ${resolved.name}/${resolved.kind} with ${Object.keys(resolved.products).length} products`);
  }

  if (product) {
    logger.debug(`Product focus: ${product}`);
  }

  return resolved;
}

/**
 * Normalize profile: apply defaults, sort keys, canonical paths
 */
function normalizeProfile(profile: RawProfile): RawProfile {
  const normalized = { ...profile };

  // Apply defaults
  if (!normalized.version) {
    normalized.version = '0.0.0';
  }
  if (!normalized.scope) {
    normalized.scope = 'repo';
  }
  if (!normalized.kind) {
    normalized.kind = 'composite';
  }

  // Sort object keys for consistency
  const sorted: RawProfile = {};
  const keys = Object.keys(normalized).sort();
  for (const key of keys) {
    sorted[key] = normalized[key];
  }

  return sorted;
}

/**
 * Apply system defaults to products
 */
function applySystemDefaultsToProducts(profile: RawProfile): RawProfile {
  const result = { ...profile };

  if (result.products && typeof result.products === 'object') {
    const products = result.products as Record<string, any>;
    for (const [_productName, productConfig] of Object.entries(products)) {
      if (typeof productConfig === 'object' && productConfig !== null) {
        // Apply IO defaults
        if (!productConfig.io) {
          productConfig.io = { ...SYSTEM_DEFAULTS.io };
        } else {
          productConfig.io = { ...SYSTEM_DEFAULTS.io, ...productConfig.io };
        }

        // Apply diff defaults
        if (!productConfig.diff) {
          productConfig.diff = { ...SYSTEM_DEFAULTS.diff };
        } else {
          productConfig.diff = { ...SYSTEM_DEFAULTS.diff, ...productConfig.diff };
        }

        // Apply capabilities defaults
        if (!productConfig.capabilities) {
          productConfig.capabilities = { ...SYSTEM_DEFAULTS.capabilities };
        } else {
          productConfig.capabilities = { ...SYSTEM_DEFAULTS.capabilities, ...productConfig.capabilities };
        }
      }
    }
  }

  return result;
}
