/**
 * @module @kb-labs/core/profiles/__tests__/artifacts.spec.ts
 * Tests for artifact system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { 
  normalizeManifest, 
  extractProfileInfo, 
  listArtifacts, 
  readArtifact,
  materializeArtifacts,
  clearCaches 
} from '../index';

describe('Artifacts System', () => {
  let testDir: string;
  let profileDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `kb-labs-profiles-test-${Date.now()}`);
    profileDir = path.join(testDir, 'node-ts-lib');
    await fsp.mkdir(profileDir, { recursive: true });
    clearCaches();
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
    clearCaches();
  });

  describe('Profile Manifest Normalization', () => {
    it('should normalize new format manifest', () => {
      const manifest = {
        schemaVersion: '1.0',
        name: 'test-profile',
        version: '1.0.0',
        exports: {
          'ai-review': {
            rules: 'artifacts/ai-review/rules.yml'
          }
        },
        defaults: {
          'ai-review': { $ref: './defaults/ai-review.json' }
        }
      };

      const normalized = normalizeManifest(manifest);
      expect(normalized.schemaVersion).toBe('1.0');
      expect(normalized.name).toBe('test-profile');
    });

    it('should migrate old format with deprecation warning', () => {
      const oldProfile = {
        name: 'test-profile',
        version: '1.0.0',
        products: {
          'ai-review': {
            config: 'artifacts/ai-review/config.yml',
            rules: 'artifacts/ai-review/rules.yml'
          }
        }
      };

      // Mock console.warn to capture deprecation warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const normalized = normalizeManifest(oldProfile);
      
      expect(normalized.schemaVersion).toBe('1.0');
      expect(normalized.exports['ai-review']).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('legacy profile format'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Artifact Listing', () => {
    it('should list artifacts with security constraints', async () => {
      // Create profile manifest
      const manifest = {
        schemaVersion: '1.0',
        name: 'test-profile',
        version: '1.0.0',
        exports: {
          'ai-review': {
            rules: 'artifacts/ai-review/rules.yml'
          }
        },
        defaults: {}
      };

      // Create artifact file
      const artifactsDir = path.join(profileDir, 'artifacts', 'ai-review');
      await fsp.mkdir(artifactsDir, { recursive: true });
      await fsp.writeFile(path.join(artifactsDir, 'rules.yml'), 'rules: []');

      const profileInfo = extractProfileInfo(manifest, path.join(profileDir, 'profile.json'));

      const artifacts = await listArtifacts(profileInfo, {
        product: 'ai-review',
        key: 'rules'
      });

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].relPath).toBe('artifacts/ai-review/rules.yml');
      expect(artifacts[0].sha256).toBeDefined();
      expect(artifacts[0].size).toBeGreaterThan(0);
    });

    it('should reject files outside profile root', async () => {
      const manifest = {
        schemaVersion: '1.0',
        name: 'test-profile',
        version: '1.0.0',
        exports: {
          'ai-review': {
            rules: '../../../etc/passwd' // Attempted escape
          }
        },
        defaults: {}
      };

      const profileInfo = extractProfileInfo(manifest, path.join(profileDir, 'profile.json'));

      const artifacts = await listArtifacts(profileInfo, {
        product: 'ai-review',
        key: 'rules'
      });

      // Should return empty array (no matches due to security)
      expect(artifacts).toHaveLength(0);
    });

    it('should reject files with disallowed extensions', async () => {
      const manifest = {
        schemaVersion: '1.0',
        name: 'test-profile',
        version: '1.0.0',
        exports: {
          'ai-review': {
            rules: 'artifacts/ai-review/rules.exe' // Disallowed extension
          }
        },
        defaults: {}
      };

      // Create the file
      const artifactsDir = path.join(profileDir, 'artifacts', 'ai-review');
      await fsp.mkdir(artifactsDir, { recursive: true });
      await fsp.writeFile(path.join(artifactsDir, 'rules.exe'), 'malicious content');

      const profileInfo = extractProfileInfo(manifest, path.join(profileDir, 'profile.json'));

      const artifacts = await listArtifacts(profileInfo, {
        product: 'ai-review',
        key: 'rules'
      });

      // Should return empty array (no matches due to security)
      expect(artifacts).toHaveLength(0);
    });
  });

  describe('Artifact Reading', () => {
    it('should read artifact with SHA256 verification', async () => {
      const manifest = {
        schemaVersion: '1.0',
        name: 'test-profile',
        version: '1.0.0',
        exports: {},
        defaults: {}
      };

      // Create artifact file
      const artifactPath = path.join(profileDir, 'rules.yml');
      const content = 'rules:\n  - security\n  - performance';
      await fsp.writeFile(artifactPath, content);

      const profileInfo = extractProfileInfo(manifest, path.join(profileDir, 'profile.json'));

      const { data, sha256 } = await readArtifact(profileInfo, 'rules.yml');

      expect(data.toString()).toBe(content);
      expect(sha256).toBeDefined();
      expect(sha256).toHaveLength(64); // SHA256 hex length
    });

    it('should reject paths that escape profile root', async () => {
      const manifest = {
        schemaVersion: '1.0',
        name: 'test-profile',
        version: '1.0.0',
        exports: {},
        defaults: {}
      };

      const profileInfo = extractProfileInfo(manifest, path.join(profileDir, 'profile.json'));

      await expect(
        readArtifact(profileInfo, '../../../etc/passwd')
      ).rejects.toThrow('Artifact path escapes profile root');
    });
  });

  describe('Artifact Materialization', () => {
    it('should materialize artifacts idempotently', async () => {
      const manifest = {
        schemaVersion: '1.0',
        name: 'test-profile',
        version: '1.0.0',
        exports: {
          'ai-review': {
            rules: 'artifacts/ai-review/rules.yml'
          }
        },
        defaults: {}
      };

      // Create artifact file
      const artifactsDir = path.join(profileDir, 'artifacts', 'ai-review');
      await fsp.mkdir(artifactsDir, { recursive: true });
      await fsp.writeFile(path.join(artifactsDir, 'rules.yml'), 'rules: []');

      const profileInfo = extractProfileInfo(manifest, path.join(profileDir, 'profile.json'));
      const destDir = path.join(testDir, 'dest');

      // First materialization
      const result1 = await materializeArtifacts(profileInfo, 'ai-review', destDir);
      expect(result1.filesCopied).toBe(1);
      expect(result1.filesSkipped).toBe(0);

      // Second materialization (should skip unchanged files)
      const result2 = await materializeArtifacts(profileInfo, 'ai-review', destDir);
      expect(result2.filesCopied).toBe(0);
      expect(result2.filesSkipped).toBe(1);

      // Verify file was copied
      const destFile = path.join(destDir, 'artifacts/ai-review/rules.yml');
      await expect(fsp.access(destFile)).resolves.toBeUndefined();
    });
  });
});
