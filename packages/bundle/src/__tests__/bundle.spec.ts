/**
 * @module @kb-labs/core-bundle/__tests__/bundle.spec.ts
 * Tests for bundle system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { loadBundle, explainBundle, clearCaches } from '../index';
import { ProductId } from '../types/types';

describe('Bundle System', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `kb-labs-bundle-test-${Date.now()}`);
    await fsp.mkdir(testDir, { recursive: true });
    clearCaches();
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
    clearCaches();
  });

  describe('loadBundle', () => {
    it('should load bundle with basic configuration', async () => {
      // Create workspace config
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: {
          default: 'node-ts-lib@1.2.0'
        },
        products: {
          'ai-review': {
            enabled: true,
            rules: ['security', 'performance']
          }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      // Create profile directory
      const profileDir = path.join(testDir, '.kb', 'profiles', 'node-ts-lib');
      await fsp.mkdir(profileDir, { recursive: true });

      const profileManifest = {
        schemaVersion: '1.0',
        name: 'node-ts-lib',
        version: '1.2.0',
        exports: {
          'ai-review': {
            rules: 'artifacts/ai-review/rules.yml'
          }
        },
        defaults: {}
      };
      await fsp.writeFile(
        path.join(profileDir, 'profile.json'),
        JSON.stringify(profileManifest, null, 2)
      );

      // Create artifact
      const artifactsDir = path.join(profileDir, 'artifacts', 'ai-review');
      await fsp.mkdir(artifactsDir, { recursive: true });
      await fsp.writeFile(
        path.join(artifactsDir, 'rules.yml'),
        'rules:\n  - security\n  - performance'
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview'
      });

      expect(bundle.product).toBe('aiReview');
      expect(bundle.profile.key).toBe('default');
      expect(bundle.profile.name).toBe('node-ts-lib');
      expect(bundle.profile.version).toBe('1.2.0');
      expect(bundle.artifacts.summary['ai-review']).toBeDefined();
      expect(bundle.policy.permits).toBeDefined();
      expect(bundle.trace).toBeDefined();
    });

    it('should throw error for missing profile', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: {
          default: 'missing-profile@1.0.0'
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      await expect(
        loadBundle({
          cwd: testDir,
          product: 'aiReview'
        })
      ).rejects.toThrow('ERR_PROFILE_RESOLVE_FAILED');
    });

    it('should throw error for missing profile key', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: {
          default: 'node-ts-lib@1.2.0'
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      await expect(
        loadBundle({
          cwd: testDir,
          product: 'aiReview',
          profileKey: 'missing'
        })
      ).rejects.toThrow('ERR_PROFILE_NOT_DEFINED');
    });

    it('should throw error for missing workspace config', async () => {
      await expect(
        loadBundle({
          cwd: testDir,
          product: 'aiReview'
        })
      ).rejects.toThrow('ERR_CONFIG_NOT_FOUND');
    });
  });

  describe('explainBundle', () => {
    it('should explain bundle configuration', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: {
          default: 'node-ts-lib@1.2.0'
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const trace = await explainBundle({
        cwd: testDir,
        product: 'aiReview'
      });

      expect(Array.isArray(trace)).toBe(true);
      expect(trace.length).toBeGreaterThan(0);
    });
  });

  describe('Artifacts', () => {
    it('should list artifacts', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: {
          default: 'node-ts-lib@1.2.0'
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const profileDir = path.join(testDir, '.kb', 'profiles', 'node-ts-lib');
      await fsp.mkdir(profileDir, { recursive: true });

      const profileManifest = {
        schemaVersion: '1.0',
        name: 'node-ts-lib',
        version: '1.2.0',
        exports: {
          'ai-review': {
            rules: 'artifacts/ai-review/rules.yml'
          }
        },
        defaults: {}
      };
      await fsp.writeFile(
        path.join(profileDir, 'profile.json'),
        JSON.stringify(profileManifest, null, 2)
      );

      const artifactsDir = path.join(profileDir, 'artifacts', 'ai-review');
      await fsp.mkdir(artifactsDir, { recursive: true });
      await fsp.writeFile(
        path.join(artifactsDir, 'rules.yml'),
        'rules: []'
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview'
      });

      const artifacts = await bundle.artifacts.list('rules');
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].relPath).toBe('artifacts/ai-review/rules.yml');
      expect(artifacts[0].sha256).toBeDefined();
    });

    it('should materialize artifacts', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: {
          default: 'node-ts-lib@1.2.0'
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const profileDir = path.join(testDir, '.kb', 'profiles', 'node-ts-lib');
      await fsp.mkdir(profileDir, { recursive: true });

      const profileManifest = {
        schemaVersion: '1.0',
        name: 'node-ts-lib',
        version: '1.2.0',
        exports: {
          'ai-review': {
            rules: 'artifacts/ai-review/rules.yml'
          }
        },
        defaults: {}
      };
      await fsp.writeFile(
        path.join(profileDir, 'profile.json'),
        JSON.stringify(profileManifest, null, 2)
      );

      const artifactsDir = path.join(profileDir, 'artifacts', 'ai-review');
      await fsp.mkdir(artifactsDir, { recursive: true });
      await fsp.writeFile(
        path.join(artifactsDir, 'rules.yml'),
        'rules: []'
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview'
      });

      const result = await bundle.artifacts.materialize(['rules']);
      expect(result.filesCopied).toBe(1);
      expect(result.filesSkipped).toBe(0);
      expect(result.bytesWritten).toBeGreaterThan(0);
    });
  });

  describe('Policy', () => {
    it('should check permissions', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: {
          default: 'node-ts-lib@1.2.0'
        },
        policy: {
          bundle: 'default@1.0.0',
          overrides: {
            schemaVersion: '1.0',
            rules: [
              {
                action: 'aiReview.run',
                allow: ['admin', 'developer']
              }
            ]
          }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const profileDir = path.join(testDir, '.kb', 'profiles', 'node-ts-lib');
      await fsp.mkdir(profileDir, { recursive: true });

      const profileManifest = {
        schemaVersion: '1.0',
        name: 'node-ts-lib',
        version: '1.2.0',
        exports: {},
        defaults: {}
      };
      await fsp.writeFile(
        path.join(profileDir, 'profile.json'),
        JSON.stringify(profileManifest, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview'
      });

      // Test permission checking
      expect(typeof bundle.policy.permits).toBe('function');
      expect(bundle.policy.bundle).toBe('default@1.0.0');
    });
  });
});
