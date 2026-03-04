/**
 * @module @kb-labs/core-runtime/service-bootstrap
 *
 * Shared bootstrap utility for KB Labs server processes.
 * Eliminates duplication of .env loading + platform init across
 * rest-api, workflow-daemon, gateway, and future services.
 *
 * @example
 * ```typescript
 * import { createServiceBootstrap, platform } from '@kb-labs/core-runtime';
 *
 * await createServiceBootstrap({ appId: 'my-service', repoRoot });
 * // platform.cache, platform.logger etc. are now ready
 * ```
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { findNearestConfig, readJsonWithDiagnostics } from '@kb-labs/core-config';
import { initPlatform, resetPlatform } from './loader.js';
import { platform, type PlatformLifecycleHooks, type PlatformLifecycleContext, type PlatformLifecyclePhase } from './container.js';
import type { PlatformConfig } from './config.js';

// ─── Module state ────────────────────────────────────────────────────────────

let _initialized = false;
const _registeredHooks = new Set<string>();

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _loadEnvFile(dir: string): void {
  const envPath = path.join(dir, '.env');
  if (!existsSync(envPath)) { return; }
  try {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) { continue; }
      const eq = trimmed.indexOf('=');
      if (eq === -1) { continue; }
      const key = trimmed.substring(0, eq).trim();
      const val = trimmed.substring(eq + 1).trim()
        .replace(/^["'](.*?)["']$/, '$1')
        .replace(/^`(.*?)`$/, '$1');
      if (key && !(key in process.env)) { process.env[key] = val; }
    }
  } catch { /* silently ignore — not critical for service operation */ }
}

function _resolvePlatformRoot(configPath: string): string {
  const configDir = path.dirname(configPath);
  return path.basename(configDir) === '.kb' ? path.dirname(configDir) : configDir;
}

function _ensureHooksRegistered(appId: string): void {
  if (_registeredHooks.has(appId)) { return; }

  const hooks: PlatformLifecycleHooks = {
    onStart: (ctx: PlatformLifecycleContext) => {
      process.stderr.write(`[${appId}:platform] lifecycle:start cwd=${ctx.cwd}\n`);
    },
    onReady: (ctx: PlatformLifecycleContext) => {
      platform.logger.info('Platform lifecycle ready', { app: appId, durationMs: ctx.metadata?.durationMs });
    },
    onShutdown: () => {
      platform.logger.info('Platform lifecycle shutdown', { app: appId });
    },
    onError: (error: unknown, phase: PlatformLifecyclePhase) => {
      process.stderr.write(`[${appId}:platform] lifecycle:error phase=${phase} ${error instanceof Error ? error.message : String(error)}\n`);
    },
  };

  platform.registerLifecycleHooks(appId, hooks);
  _registeredHooks.add(appId);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ServiceBootstrapOptions {
  /** Unique identifier for this service — used in log messages and lifecycle hooks. */
  appId: string;
  /** Monorepo root directory: .env is loaded from here, kb.config.json is searched from here. */
  repoRoot: string;
  /**
   * Whether to store the raw config in `globalThis.__KB_RAW_CONFIG__` for `useConfig()`.
   * @default true
   */
  storeRawConfig?: boolean;
  /**
   * Whether to load `.env` from repoRoot before platform init.
   * @default true
   */
  loadEnv?: boolean;
}

/**
 * Shared bootstrap for KB Labs service processes.
 *
 * 1. Loads `.env` from `repoRoot` (unless `loadEnv: false`)
 * 2. Reads `platform` config from `.kb/kb.config.json`
 * 3. Calls `initPlatform()` — falls back to NoOp adapters on error
 * 4. Registers lifecycle hooks keyed by `appId`
 *
 * Idempotent: subsequent calls return immediately if already initialized.
 * Returns the `platform` singleton for convenience.
 */
export async function createServiceBootstrap(
  options: ServiceBootstrapOptions,
): Promise<typeof platform> {
  const { appId, repoRoot, storeRawConfig = true, loadEnv = true } = options;

  _ensureHooksRegistered(appId);

  if (_initialized) {
    return platform;
  }

  // Step 1: load .env before any adapter instantiation (e.g. OPENAI_API_KEY)
  if (loadEnv) {
    _loadEnvFile(repoRoot);
  }

  try {
    const { path: configPath } = await findNearestConfig({
      startDir: repoRoot,
      filenames: ['.kb/kb.config.json', 'kb.config.json'],
    });

    if (!configPath) {
      process.stderr.write(`[${appId}:platform] No kb.config.json found, using NoOp adapters\n`);
      await initPlatform({ adapters: {} }, repoRoot);
      _initialized = true;
      return platform;
    }

    const result = await readJsonWithDiagnostics<{ platform?: PlatformConfig }>(configPath);
    const platformRoot = _resolvePlatformRoot(configPath);

    if (!result.ok) {
      process.stderr.write(`[${appId}:platform] Failed to read kb.config.json, using NoOp adapters\n`);
      await initPlatform({ adapters: {} }, repoRoot);
      _initialized = true;
      return platform;
    }

    if (storeRawConfig) {
      (globalThis as Record<string, unknown>).__KB_RAW_CONFIG__ = result.data;
    }

    const platformConfig = result.data.platform;
    if (!platformConfig) {
      process.stderr.write(`[${appId}:platform] No platform section in kb.config.json, using NoOp adapters\n`);
      await initPlatform({ adapters: {} }, repoRoot);
      _initialized = true;
      return platform;
    }

    await initPlatform(platformConfig, platformRoot);
    _initialized = true;

    platform.logger.info('Platform adapters initialized', {
      app: appId,
      adapters: Object.keys(platformConfig.adapters ?? {}),
      platformRoot,
    });
  } catch (error) {
    process.stderr.write(`[${appId}:platform] Initialization failed, using NoOp adapters: ${error instanceof Error ? error.message : String(error)}\n`);
    await initPlatform({ adapters: {} }, repoRoot);
    _initialized = true;
  }

  return platform;
}

/**
 * Reset bootstrap state — for use in tests only.
 * Also calls `resetPlatform()` from the loader.
 * @internal
 */
export function resetServiceBootstrap(): void {
  _initialized = false;
  _registeredHooks.clear();
  resetPlatform();
}
