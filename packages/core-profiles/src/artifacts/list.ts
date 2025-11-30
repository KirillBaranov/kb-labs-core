/**
 * @module @kb-labs/core/profiles/artifacts/list
 * Artifact listing with glob patterns, security, and limits
 */

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { createHash } from 'node:crypto';
import type { ArtifactMetadata, ArtifactDescriptor, ProfileInfo } from '../types/types';
import { artifactCache } from '../cache/artifact-cache';
import { KbError, ERROR_HINTS } from '@kb-labs/core-config';

const ALLOWED_EXT = new Set(['.yml', '.yaml', '.md', '.txt', '.json']);
const MAX_FILES_PER_KEY = 100;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/**
 * List artifacts for a product with security constraints
 */
export async function listArtifacts(
  profile: ProfileInfo,
  descriptor: ArtifactDescriptor
): Promise<ArtifactMetadata[]> {
  const { product, key, selector } = descriptor;
  
  // Get export patterns for the product
  const productExports = profile.exports[product];
  if (!productExports) {
    return [];
  }
  
  const patterns = productExports[key];
  if (!patterns) {
    return [];
  }
  
  const patternList = Array.isArray(patterns) ? patterns : [patterns];
  const profileRoot = path.dirname(profile.manifestPath);
  const results: ArtifactMetadata[] = [];
  
  for (const pattern of patternList) {
    const fullPattern = path.join(profileRoot, pattern);
    const matches = await glob(fullPattern, { 
      cwd: profileRoot,
      absolute: true,
      nodir: true,
    });
    
    // Apply security constraints
    const filteredMatches = matches.filter(match => 
      isAllowedArtifact(match, profileRoot)
    );
    
    // Check file count limit
    if (filteredMatches.length > MAX_FILES_PER_KEY) {
      throw new KbError(
        'ERR_ARTIFACT_LIMIT_EXCEEDED',
        `Too many files for key "${key}": ${filteredMatches.length} > ${MAX_FILES_PER_KEY}`,
        'Reduce the glob pattern or increase maxFilesPerKey limit',
        { key, count: filteredMatches.length, limit: MAX_FILES_PER_KEY }
      );
    }
    
    // Process each file
    for (const absPath of filteredMatches) {
      const relPath = path.relative(profileRoot, absPath);
      
      // Check cache first
      const cached = artifactCache.get(profileRoot, relPath);
      if (cached) {
        results.push(cached);
        continue;
      }
      
      try {
        const metadata = await getArtifactMetadata(absPath, relPath);
        artifactCache.set(profileRoot, relPath, metadata);
        results.push(metadata);
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Warning: Could not read artifact ${relPath}:`, error);
      }
    }
  }
  
  return results;
}

/**
 * Get artifact metadata with security checks
 */
async function getArtifactMetadata(absPath: string, relPath: string): Promise<ArtifactMetadata> {
  const stats = await fsp.stat(absPath);
  
  // Check file size limit
  if (stats.size > MAX_FILE_SIZE) {
    throw new KbError(
      'ERR_ARTIFACT_TOO_LARGE',
      `Artifact too large: ${relPath} (${stats.size} bytes)`,
      'File exceeds 1MB limit',
      { relPath, size: stats.size, limit: MAX_FILE_SIZE }
    );
  }
  
  // Read file and compute SHA256
  const data = await fsp.readFile(absPath);
  const sha256 = createHash('sha256').update(data).digest('hex');
  
  // Detect MIME type
  const mimeType = detectMimeType(absPath);
  
  return {
    absPath,
    relPath,
    sha256,
    size: stats.size,
    mime: mimeType,
  };
}

/**
 * Check if artifact is allowed (security)
 */
function isAllowedArtifact(absPath: string, profileRoot: string): boolean {
  // Check if path is within profile root (no .. escapes)
  if (!absPath.startsWith(profileRoot)) {
    return false;
  }
  
  // Check file extension
  const ext = path.extname(absPath).toLowerCase();
  return ALLOWED_EXT.has(ext);
}

/**
 * Detect MIME type from file extension
 */
function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  const mimeMap: Record<string, string> = {
    '.yml': 'text/yaml',
    '.yaml': 'text/yaml',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.json': 'application/json',
  };
  
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Convert POSIX paths for Windows compatibility
 */
export function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}
