/**
 * @module @kb-labs/core-profiles/profile-service
 * ProfileService class with high-level methods
 */

import { getLogger } from "@kb-labs/core-sys";
import { loadProfile } from "./load-profile";
import { validateProfile } from "./validate-profile";
import { resolveProfile } from "./resolve-profile";
import { memCache } from "../cache";
import type { RawProfile, ResolvedProfile, ResolveOptions, ProductConfig } from "../types";

export interface ProfileServiceOptions {
  /** Working directory for profile operations */
  cwd?: string;
  /** Default profile name */
  defaultName?: string;
  /** Strict mode */
  strict?: boolean;
}

/**
 * High-level service for profile operations
 */
export class ProfileService {
  private readonly logger = getLogger();
  private readonly cwd: string;
  private readonly defaultName: string;
  private readonly strict: boolean;
  private cache = memCache<ResolvedProfile>();

  static readonly meta = {
    service: 'ProfileService',
    version: '1.0.0',
    description: 'High-level API for managing, resolving and validating KB Labs profiles'
  };

  constructor(options: ProfileServiceOptions = {}) {
    this.cwd = options.cwd || process.cwd();
    this.defaultName = options.defaultName || 'default';
    this.strict = options.strict ?? true;
    this.logger.debug(`[ProfileService] init`, {
      ...ProfileService.meta,
      cwd: this.cwd,
      defaultName: this.defaultName,
      strict: this.strict,
    });
  }

  /**
   * Load a profile by name
   * 
   * @param name - Profile name (uses default if not provided)
   * @returns Promise resolving to loaded profile result
   */
  async load(name?: string) {
    return loadProfile({ cwd: this.cwd, name: name || this.defaultName });
  }

  validate(profile: RawProfile) {
    return validateProfile(profile);
  }

  // 1) позволяем переопределить strict на вызове
  async resolve(opts: Omit<ResolveOptions, 'cwd'> = {}) {
    const effectiveStrict = opts.strict ?? this.strict;
    return resolveProfile({
      ...opts,
      cwd: this.cwd,
      name: opts.name || this.defaultName,
      strict: effectiveStrict,
    });
  }

  // 3) ключ кеша учитывает cwd/strict
  async resolveCached(opts: Omit<ResolveOptions, 'cwd'> = {}) {
    const name = opts.name || this.defaultName;
    const product = opts.product || 'all';
    const effectiveStrict = opts.strict ?? this.strict;
    const key = `${this.cwd}::${name}::${product}::strict=${effectiveStrict}`;

    const cached = await this.cache.get(key);
    if (cached) {
      this.logger.debug(`[ProfileService] cache hit: ${key}`);
      return cached;
    }
    const resolved = await this.resolve({ ...opts, strict: effectiveStrict });
    await this.cache.set(key, resolved);
    this.logger.debug(`[ProfileService] cache store: ${key}`);
    return resolved;
  }

  // 2) утилиты для кеша
  clearCache() {
    // Note: memCache doesn't have clear method, so we create a new instance
    this.cache = memCache<ResolvedProfile>();
    this.logger.debug(`[ProfileService] cache cleared`);
  }

  cacheSize() {
    // Note: memCache doesn't have size method, returning 0 as placeholder
    // In real implementation, you might want to track size separately
    return 0;
  }

  getProductConfig(resolved: ResolvedProfile, product: string): Required<ProductConfig> | null {
    const productConfig = resolved.products[product];
    if (!productConfig) {
      this.logger.debug(`Product not found: ${product}`);
      return null;
    }
    const defaults = resolved.meta.defaults as any;
    const merged: Required<ProductConfig> = {
      enabled: productConfig.enabled ?? defaults?.enabled ?? true,
      config: productConfig.config ?? defaults?.config ?? '',
      io: productConfig.io ?? defaults?.io ?? {},
      diff: productConfig.diff ?? defaults?.diff ?? {},
      capabilities: productConfig.capabilities ?? defaults?.capabilities ?? {},
      metadata: productConfig.metadata ?? defaults?.metadata ?? {}
    };
    this.logger.debug(`Product config for ${product}:`, merged);
    return merged;
  }

  debugDump(resolved: ResolvedProfile) {
    const summary = {
      profile: {
        name: resolved.name,
        kind: resolved.kind,
        scope: resolved.scope,
        version: resolved.version
      },
      roots: resolved.roots,
      files: { count: resolved.files.length, list: resolved.files.slice(0, 5) },
      products: { count: Object.keys(resolved.products).length, list: Object.keys(resolved.products) },
      rules: { count: Array.isArray(resolved.rules) ? resolved.rules.length : 0 },
      meta: {
        pathAbs: resolved.meta.pathAbs,
        repoRoot: resolved.meta.repoRoot,
        extendsChain: resolved.meta.extendsChain,
        overridesChain: resolved.meta.overridesChain,
        validationResult: resolved.meta.validationResult
      }
    };
    this.logger.debug('Profile debug dump:', summary);
    return summary;
  }
}
