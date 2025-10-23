/**
 * @module @kb-labs/core/config/lockfile/lockfile
 * Lockfile generation and management
 */

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { KbError, ERROR_HINTS } from '../errors/kb-error';
import { computeConfigHash } from '../hash/config-hash';
import { toFsProduct } from '../utils/product-normalize';
import { ProductId } from '../types';

export interface LockfileData {
  $schema?: string;
  schemaVersion: '1.0';
  orgPreset?: string;
  profile?: string;
  policyBundle?: string;
  hashes: Record<string, string>;
  generatedAt: string;
}

/**
 * Read lockfile from workspace
 */
export async function readLockfile(cwd: string): Promise<LockfileData | null> {
  const lockfilePath = path.join(cwd, '.kb', 'lockfile.json');
  
  try {
    const lockfileData = await fsp.readFile(lockfilePath, 'utf-8');
    return JSON.parse(lockfileData) as LockfileData;
  } catch {
    return null;
  }
}

/**
 * Write lockfile to workspace
 */
export async function writeLockfile(
  cwd: string,
  lockfileData: LockfileData
): Promise<void> {
  const lockfileDir = path.join(cwd, '.kb');
  const lockfilePath = path.join(lockfileDir, 'lockfile.json');
  
  // Ensure .kb directory exists
  await fsp.mkdir(lockfileDir, { recursive: true });
  
  // Add schema if not present
  if (!lockfileData.$schema) {
    lockfileData.$schema = 'https://schemas.kb-labs.dev/lockfile.schema.json';
  }
  
  // Write lockfile
  await fsp.writeFile(lockfilePath, JSON.stringify(lockfileData, null, 2));
}

/**
 * Update lockfile with new hashes
 */
export async function updateLockfile(
  cwd: string,
  updates: {
    orgPreset?: string;
    profile?: string;
    policyBundle?: string;
    configHashes?: Record<ProductId, any>;
  }
): Promise<LockfileData> {
  const existing = await readLockfile(cwd);
  
  const lockfileData: LockfileData = {
    $schema: 'https://schemas.kb-labs.dev/lockfile.schema.json',
    schemaVersion: '1.0',
    orgPreset: updates.orgPreset || existing?.orgPreset,
    profile: updates.profile || existing?.profile,
    policyBundle: updates.policyBundle || existing?.policyBundle,
    hashes: { ...existing?.hashes },
    generatedAt: new Date().toISOString(),
  };
  
  // Update config hashes
  if (updates.configHashes) {
    for (const [product, config] of Object.entries(updates.configHashes)) {
      const fsProduct = toFsProduct(product as ProductId);
      const hash = computeConfigHash(config);
      lockfileData.hashes[fsProduct] = hash;
    }
  }
  
  await writeLockfile(cwd, lockfileData);
  return lockfileData;
}

/**
 * Get config hash for a product
 */
export function getLockfileConfigHash(product: ProductId, config: any): string {
  return computeConfigHash(config);
}

/**
 * Check if lockfile is up to date
 */
export async function isLockfileUpToDate(
  cwd: string,
  configs: Record<ProductId, any>
): Promise<boolean> {
  const lockfile = await readLockfile(cwd);
  if (!lockfile) {
    return false;
  }
  
  for (const [product, config] of Object.entries(configs)) {
    const fsProduct = toFsProduct(product as ProductId);
    const currentHash = computeConfigHash(config);
    const lockfileHash = lockfile.hashes[fsProduct];
    
    if (currentHash !== lockfileHash) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate lockfile schema
 */
export function validateLockfile(lockfileData: any): lockfileData is LockfileData {
  if (!lockfileData || typeof lockfileData !== 'object') {
    return false;
  }
  
  if (lockfileData.schemaVersion !== '1.0') {
    return false;
  }
  
  if (!lockfileData.hashes || typeof lockfileData.hashes !== 'object') {
    return false;
  }
  
  if (!lockfileData.generatedAt || typeof lockfileData.generatedAt !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * Get lockfile statistics
 */
export function getLockfileStats(lockfileData: LockfileData): {
  productCount: number;
  hasOrgPreset: boolean;
  hasProfile: boolean;
  hasPolicyBundle: boolean;
  generatedAt: Date;
} {
  return {
    productCount: Object.keys(lockfileData.hashes).length,
    hasOrgPreset: !!lockfileData.orgPreset,
    hasProfile: !!lockfileData.profile,
    hasPolicyBundle: !!lockfileData.policyBundle,
    generatedAt: new Date(lockfileData.generatedAt),
  };
}
