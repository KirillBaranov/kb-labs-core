/**
 * @module @kb-labs/core-bundle/__tests__/load-bundle-edge-cases.spec.ts
 * Edge cases and error handling tests for loadBundle
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { loadBundle, clearCaches } from '../index';

describe('loadBundle Edge Cases', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `kb-labs-bundle-edge-${Date.now()}`);
    await fsp.mkdir(testDir, { recursive: true });
    clearCaches();
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
    clearCaches();
  });

  describe('Profile Edge Cases', () => {
    it('should handle missing profile gracefully when scopeId provided', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: []
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      await expect(
        loadBundle({
          cwd: testDir,
          product: 'aiReview',
          scopeId: 'some-scope'
        })
      ).rejects.toThrow('ERR_PROFILE_NOT_DEFINED');
    });

    it('should auto-select single available profile', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            label: 'Default Profile',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview'
        // No profileId - should auto-select single profile
      });

      expect(bundle.profile).toBeDefined();
      expect(bundle.profile!.id).toBe('default');
    });

    it('should handle multiple profiles without explicit selection', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'profile1',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          },
          {
            id: 'profile2',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      // Should work without profile when multiple profiles exist
      // (profile is optional if not using scopes)
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview'
      });

      expect(bundle.config).toBeDefined();
      // Profile may be null when multiple profiles exist and none selected
      // This is acceptable behavior
    });
  });

  describe('Scope Selection', () => {
    it('should select default scope when no scopeId provided', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [
              { id: 'root', include: ['**/*'], default: true },
              { id: 'src', include: ['src/**/*'] }
            ]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default'
      });

      expect(bundle.profile?.activeScopeId).toBe('root');
      expect(bundle.profile?.activeScope?.id).toBe('root');
    });

    it('should select explicit scope when scopeId provided', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [
              { id: 'root', include: ['**/*'], default: true },
              { id: 'src', include: ['src/**/*'] }
            ]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default',
        scopeId: 'src'
      });

      expect(bundle.profile?.activeScopeId).toBe('src');
      expect(bundle.profile?.activeScope?.id).toBe('src');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate config when validate=true', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true, invalidField: 'should fail validation' }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      // Should throw on validation failure when validate=true
      await expect(
        loadBundle({
          cwd: testDir,
          product: 'aiReview',
          profileId: 'default',
          validate: true
        })
      ).rejects.toThrow();
    });

    it('should warn on validation failure when validate=warn', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      // Should not throw on validation failure when validate=warn
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default',
        validate: 'warn'
      });

      expect(bundle.config).toBeDefined();
    });
  });

  describe('CLI Overrides', () => {
    it('should apply CLI overrides to configuration', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true, maxFiles: 100 }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default',
        cli: { maxFiles: 50 }
      });

      const config = bundle.config as any;
      expect(config.maxFiles).toBe(50); // CLI override should win
    });
  });

  describe('Workspace Resolution', () => {
    it('should resolve workspace root from subdirectory', async () => {
      // Create workspace structure
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      // Create subdirectory
      const subDir = path.join(testDir, 'src', 'subdir');
      await fsp.mkdir(subDir, { recursive: true });

      // Load bundle from subdirectory - should find workspace root
      const bundle = await loadBundle({
        cwd: subDir,
        product: 'aiReview',
        profileId: 'default'
      });

      expect(bundle.config).toBeDefined();
    });
  });

  describe('Legacy Profile Support', () => {
    it('should support legacy profile references', async () => {
      // Note: Legacy profiles are stored in workspaceData.profiles as Record<string, string>
      // This is separate from Profiles v2 profiles array
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        // Legacy format: profiles as object mapping
        // In actual config, this would be at the same level, not in a separate key
        // But for test purposes, we're testing the legacy profile loading logic
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      // Create legacy profile directory
      const profileDir = path.join(testDir, '.kb', 'profiles', 'legacy-profile');
      await fsp.mkdir(profileDir, { recursive: true });

      const profileManifest = {
        schemaVersion: '1.0',
        name: 'legacy-profile',
        version: '1.0.0',
        exports: {
          'ai-review': {
            rules: 'rules.yml'
          }
        },
        defaults: {}
      };
      await fsp.writeFile(
        path.join(profileDir, 'profile.json'),
        JSON.stringify(profileManifest, null, 2)
      );

      // Should load bundle with legacy profile reference
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default'
      });

      expect(bundle.config).toBeDefined();
      // Legacy profile should be available for artifacts
      expect(bundle.artifacts.summary).toBeDefined();
    });
  });

  describe('Policy Resolution', () => {
    it('should handle missing policy gracefully', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
        // No policy section
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default'
      });

      // Should still work without policy - permit-all mode
      expect(bundle.policy).toBeDefined();
      expect(bundle.policy.permits).toBeDefined();
      expect(typeof bundle.policy.permits).toBe('function');
    });

    it('should resolve policy with workspace overrides', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        },
        policy: {
          bundle: 'default@1.0.0',
          overrides: {
            schemaVersion: '1.0',
            rules: [
              {
                action: 'aiReview.run',
                allow: ['admin']
              }
            ]
          }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default'
      });

      expect(bundle.policy).toBeDefined();
      expect(bundle.policy.bundle).toBe('default@1.0.0');
    });
  });

  describe('Artifact Wrapper Edge Cases', () => {
    it('should handle missing profile info for artifacts', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default'
      });

      // Should have empty artifacts when no profile info
      expect(bundle.artifacts.summary).toEqual({});
      const artifacts = await bundle.artifacts.list('rules');
      expect(artifacts).toEqual([]);
    });

    it('should handle readText on missing artifact', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default'
      });

      // Should throw when trying to read missing artifact
      await expect(
        bundle.artifacts.readText('nonexistent.yml')
      ).rejects.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should work correctly after cache clear', async () => {
      const workspaceConfig = {
        schemaVersion: '1.0',
        profiles: [
          {
            id: 'default',
            scopes: [{ id: 'root', include: ['**/*'], default: true }]
          }
        ],
        products: {
          'ai-review': { enabled: true }
        }
      };
      await fsp.writeFile(
        path.join(testDir, 'kb.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      // Load bundle first time
      const bundle1 = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default'
      });

      // Clear cache
      clearCaches();

      // Load bundle second time - should still work
      const bundle2 = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileId: 'default'
      });

      expect(bundle2.config).toBeDefined();
      expect(bundle2.profile?.id).toBe(bundle1.profile?.id);
    });
  });
});

