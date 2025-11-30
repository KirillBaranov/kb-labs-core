/**
 * @module @kb-labs/core/profiles/artifacts/read
 * Artifact reading with SHA256 verification and POSIX paths
 */

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ProfileInfo } from '../types/types';
import { KbError, ERROR_HINTS } from '@kb-labs/core-config';

/**
 * Read artifact with SHA256 verification
 */
export async function readArtifact(
  profile: ProfileInfo,
  relPath: string
): Promise<{ data: Buffer; sha256: string }> {
  const profileRoot = path.dirname(profile.manifestPath);
  const absPath = path.join(profileRoot, relPath);
  
  // Security check: ensure path is within profile root
  if (!absPath.startsWith(profileRoot)) {
    throw new KbError(
      'ERR_ARTIFACT_PATH_ESCAPE',
      `Artifact path escapes profile root: ${relPath}`,
      'Artifact paths must be within the profile directory',
      { relPath, profileRoot }
    );
  }
  
  try {
    const data = await fsp.readFile(absPath);
    const sha256 = createHash('sha256').update(data).digest('hex');
    
    return { data, sha256 };
  } catch (error) {
    throw new KbError(
      'ERR_ARTIFACT_READ_FAILED',
      `Failed to read artifact: ${relPath}`,
      ERROR_HINTS.ERR_PROFILE_RESOLVE_FAILED,
      { relPath, error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Read artifact as text with encoding detection
 */
export async function readArtifactText(
  profile: ProfileInfo,
  relPath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<{ text: string; sha256: string }> {
  const { data, sha256 } = await readArtifact(profile, relPath);
  const text = data.toString(encoding);
  
  return { text, sha256 };
}

/**
 * Read artifact as JSON
 */
export async function readArtifactJson<T = any>(
  profile: ProfileInfo,
  relPath: string
): Promise<{ data: T; sha256: string }> {
  const { text, sha256 } = await readArtifactText(profile, relPath);
  
  try {
    const data = JSON.parse(text) as T;
    return { data, sha256 };
  } catch (error) {
    throw new KbError(
      'ERR_ARTIFACT_JSON_INVALID',
      `Invalid JSON in artifact: ${relPath}`,
      'Check JSON syntax in the artifact file',
      { relPath, error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Read artifact as YAML
 */
export async function readArtifactYaml<T = any>(
  profile: ProfileInfo,
  relPath: string
): Promise<{ data: T; sha256: string }> {
  const { text, sha256 } = await readArtifactText(profile, relPath);
  
  try {
    // Dynamic import for YAML parsing
    const YAML = await import('yaml');
    const data = YAML.parse(text) as T;
    return { data, sha256 };
  } catch (error) {
    throw new KbError(
      'ERR_ARTIFACT_YAML_INVALID',
      `Invalid YAML in artifact: ${relPath}`,
      'Check YAML syntax in the artifact file',
      { relPath, error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Verify artifact SHA256
 */
export async function verifyArtifactSha256(
  profile: ProfileInfo,
  relPath: string,
  expectedSha256: string
): Promise<boolean> {
  const { sha256 } = await readArtifact(profile, relPath);
  return sha256 === expectedSha256;
}
