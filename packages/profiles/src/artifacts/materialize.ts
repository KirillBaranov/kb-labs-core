/**
 * @module @kb-labs/core/profiles/artifacts/materialize
 * Idempotent artifact materialization with SHA-based skip
 */

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ProfileInfo, MaterializeResult, ArtifactDescriptor } from '../types/types';
import { listArtifacts } from './list';
import { readArtifact } from './read';
import { toPosix } from './list';
import { KbError, ERROR_HINTS } from '@kb-labs/core-config';

/**
 * Materialize artifacts to destination directory
 */
export async function materializeArtifacts(
  profile: ProfileInfo,
  product: string,
  destDirAbs: string,
  keys?: string[]
): Promise<MaterializeResult> {
  // Ensure destination directory exists
  await fsp.mkdir(destDirAbs, { recursive: true });
  
  // Create profiles cache directory
  const cacheDir = path.join(destDirAbs, 'profiles-cache');
  await fsp.mkdir(cacheDir, { recursive: true });
  
  const manifestPath = path.join(cacheDir, '.manifest.json');
  let manifest: Record<string, { relPath: string; sha256: string; size: number }> = {};
  
  // Load existing manifest if it exists
  try {
    const manifestData = await fsp.readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestData);
  } catch {
    // Manifest doesn't exist yet, start with empty
  }
  
  let filesCopied = 0;
  let filesSkipped = 0;
  let bytesWritten = 0;
  const outputs: string[] = [];
  const newManifest: Record<string, { relPath: string; sha256: string; size: number }> = {};
  
  // Get product exports
  const productExports = profile.exports[product];
  if (!productExports) {
    return {
      filesCopied: 0,
      filesSkipped: 0,
      bytesWritten: 0,
      outputs: [],
      manifest: {},
    };
  }
  
  // Process each key
  const keysToProcess = keys || Object.keys(productExports);
  
  for (const key of keysToProcess) {
    const descriptor: ArtifactDescriptor = { product, key };
    const artifacts = await listArtifacts(profile, descriptor);
    
    for (const artifact of artifacts) {
      const destPath = path.join(destDirAbs, artifact.relPath);
      const manifestKey = `${key}:${artifact.relPath}`;
      
      // Check if file already exists and hasn't changed
      const existingEntry = manifest[manifestKey];
      if (existingEntry && 
          existingEntry.sha256 === artifact.sha256 &&
          existingEntry.size === artifact.size) {
        // File hasn't changed, skip
        filesSkipped++;
        newManifest[manifestKey] = existingEntry;
        continue;
      }
      
      // Ensure destination directory exists
      await fsp.mkdir(path.dirname(destPath), { recursive: true });
      
      // Copy file
      const { data } = await readArtifact(profile, artifact.relPath);
      await fsp.writeFile(destPath, data);
      
      // Update manifest
      newManifest[manifestKey] = {
        relPath: artifact.relPath,
        sha256: artifact.sha256,
        size: artifact.size,
      };
      
      filesCopied++;
      bytesWritten += artifact.size;
      outputs.push(toPosix(artifact.relPath));
    }
  }
  
  // Write updated manifest
  await fsp.writeFile(manifestPath, JSON.stringify(newManifest, null, 2));
  
  return {
    filesCopied,
    filesSkipped,
    bytesWritten,
    outputs,
    manifest: newManifest,
  };
}

/**
 * Get materialization manifest
 */
export async function getMaterializationManifest(
  destDirAbs: string
): Promise<Record<string, { relPath: string; sha256: string; size: number }> | null> {
  const manifestPath = path.join(destDirAbs, 'profiles-cache', '.manifest.json');
  
  try {
    const manifestData = await fsp.readFile(manifestPath, 'utf-8');
    return JSON.parse(manifestData);
  } catch {
    return null;
  }
}

/**
 * Clear materialized artifacts
 */
export async function clearMaterializedArtifacts(destDirAbs: string): Promise<void> {
  const cacheDir = path.join(destDirAbs, 'profiles-cache');
  
  try {
    await fsp.rm(cacheDir, { recursive: true, force: true });
  } catch {
    // Ignore errors if directory doesn't exist
  }
}

/**
 * Check if artifacts need materialization
 */
export async function needsMaterialization(
  profile: ProfileInfo,
  product: string,
  destDirAbs: string,
  keys?: string[]
): Promise<boolean> {
  const manifest = await getMaterializationManifest(destDirAbs);
  if (!manifest) {
    return true; // No manifest means needs materialization
  }
  
  const productExports = profile.exports[product];
  if (!productExports) {
    return false;
  }
  
  const keysToCheck = keys || Object.keys(productExports);
  
  for (const key of keysToCheck) {
    const descriptor: ArtifactDescriptor = { product, key };
    const artifacts = await listArtifacts(profile, descriptor);
    
    for (const artifact of artifacts) {
      const manifestKey = `${key}:${artifact.relPath}`;
      const existingEntry = manifest[manifestKey];
      
      if (!existingEntry || 
          existingEntry.sha256 !== artifact.sha256 ||
          existingEntry.size !== artifact.size) {
        return true; // File changed or missing
      }
    }
  }
  
  return false; // All files up to date
}
