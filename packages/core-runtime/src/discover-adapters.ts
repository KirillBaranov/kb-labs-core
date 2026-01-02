/**
 * @module @kb-labs/core-runtime/discover-adapters
 * Auto-discovery of adapters from workspace packages.
 *
 * Similar to CLI plugin discovery, this scans kb-labs-adapters/packages/*
 * and loads adapters by file path (not package name).
 */

import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { glob } from 'glob';

/**
 * Discovered adapter info
 */
export interface DiscoveredAdapter {
  /** Package name (e.g., "@kb-labs/adapters-openai") */
  packageName: string;
  /** Absolute path to package root */
  pkgRoot: string;
  /** Adapter factory function */
  createAdapter: (config?: any) => any;
  /** Adapter module (full exports) */
  module: any;
}

/**
 * Read package.json at given path
 */
async function readPackageJson(pkgPath: string): Promise<any> {
  try {
    const content = await fs.readFile(pkgPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load adapter module by file path (ESM import)
 */
async function loadAdapterModule(distPath: string): Promise<any> {
  const fileUrl = pathToFileURL(distPath).href;
  return await import(fileUrl);
}

/**
 * Check if package is an adapter (has @kb-labs/adapters-* name)
 */
function isAdapterPackage(pkg: any): boolean {
  return pkg?.name?.startsWith('@kb-labs/adapters-');
}

/**
 * Discover adapters from workspace packages.
 * Scans kb-labs-adapters/packages/* and loads built adapters.
 *
 * @param cwd - Workspace root directory
 * @returns Map of package names to adapter info
 *
 * @example
 * ```typescript
 * const adapters = await discoverAdapters('/Users/kb-labs');
 * const openai = adapters.get('@kb-labs/adapters-openai');
 * if (openai) {
 *   const llm = openai.createAdapter({ model: 'gpt-4' });
 * }
 * ```
 */
export async function discoverAdapters(cwd: string): Promise<Map<string, DiscoveredAdapter>> {
  const discovered = new Map<string, DiscoveredAdapter>();

  // Scan kb-labs-adapters/packages/*
  const adaptersBase = path.join(cwd, 'kb-labs-adapters', 'packages');

  try {
    // Check if kb-labs-adapters exists
    await fs.access(adaptersBase);
  } catch {
    // kb-labs-adapters not found, return empty map
    return discovered;
  }

  // Find all package.json files
  const pkgPattern = path.join(adaptersBase, '*/package.json');
  const pkgFiles = await glob(pkgPattern, {
    cwd: adaptersBase,
    absolute: false,
  });

  // Load each adapter package
  for (const pkgFile of pkgFiles) {
    const pkgPath = path.join(adaptersBase, pkgFile);
    const pkgRoot = path.dirname(pkgPath);
    const pkg = await readPackageJson(pkgPath);

    if (!pkg || !isAdapterPackage(pkg)) {
      continue;
    }

    // Find main export (dist/index.js)
    const distPath = path.join(pkgRoot, pkg.main || 'dist/index.js');

    try {
      // Check if dist exists (package must be built)
      await fs.access(distPath);

      // Load module
      const module = await loadAdapterModule(distPath);

      // Check for createAdapter export
      if (typeof module.createAdapter !== 'function') {
        // Skip adapters without createAdapter export (e.g., pino-http is a helper, not an adapter)
        continue;
      }

      discovered.set(pkg.name, {
        packageName: pkg.name,
        pkgRoot,
        createAdapter: module.createAdapter,
        module,
      });
    } catch {
      // Silently skip adapters that fail to load (likely not built yet)
    }
  }

  return discovered;
}

/**
 * Resolve adapter path - tries discovery first, falls back to package name import.
 *
 * @param adapterPath - Package name or file path
 * @param cwd - Workspace root directory
 * @returns Adapter factory function
 *
 * @example
 * ```typescript
 * // Try to discover first (workspace)
 * const adapter = await resolveAdapter('@kb-labs/adapters-openai', cwd);
 *
 * // Falls back to dynamic import if not found in workspace
 * const adapter = await resolveAdapter('@kb-labs/adapters-openai', cwd);
 * ```
 */
export async function resolveAdapter(
  adapterPath: string,
  cwd: string
): Promise<((config?: any) => any) | null> {
  // Try workspace discovery first
  const discovered = await discoverAdapters(cwd);

  // Check for subpath exports (e.g., "@kb-labs/adapters-openai/embeddings")
  const basePkgName = adapterPath.split('/').slice(0, 2).join('/'); // "@kb-labs/adapters-openai"
  const subpath = adapterPath.includes('/') ? adapterPath.split('/').slice(2).join('/') : null; // "embeddings"

  const adapter = discovered.get(basePkgName);

  if (adapter && subpath) {
    // Load subpath export from workspace adapter
    const subpathFile = path.join(adapter.pkgRoot, 'dist', `${subpath}.js`);
    try {
      await fs.access(subpathFile);
      const module = await loadAdapterModule(subpathFile);
      if (typeof module.createAdapter === 'function') {
        return module.createAdapter;
      }
      if (typeof module.default === 'function') {
        return module.default;
      }
    } catch {
      // Silently skip subpath that fails to load
    }
  } else if (adapter) {
    return adapter.createAdapter;
  }

  // Fallback: try dynamic import (for npm-installed adapters)
  try {
    const module = await import(adapterPath);
    if (typeof module.createAdapter === 'function') {
      return module.createAdapter;
    }
    if (typeof module.default === 'function') {
      return module.default;
    }
    return null;
  } catch {
    return null;
  }
}
