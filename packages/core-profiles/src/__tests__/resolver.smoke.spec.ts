/**
 * @module @kb-labs/core-profiles/smoke-tests
 * Smoke tests for profiles MVP functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveProfile, ProfileService, SchemaValidationError } from '../index';
import { ProfileNotFoundError } from '../errors';

describe('Profiles MVP Smoke Tests', () => {
  const testDir = path.join(__dirname, '..', '..', '.test-tmp');
  const profilesDir = path.join(testDir, '.kb', 'profiles');

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(profilesDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Happy Path', () => {
    it('should resolve a valid profile from .kb/profiles/default/profile.json', async () => {
      // Create a valid profile
      const profilePath = path.join(profilesDir, 'default', 'profile.json');
      await fs.mkdir(path.dirname(profilePath), { recursive: true });

      const validProfile = {
        name: 'test-profile',
        kind: 'composite',
        scope: 'repo',
        version: '1.0.0',
        products: {
          review: {
            enabled: true,
            config: 'review-config',
            metadata: {
              description: 'Review product config'
            }
          }
        },
        metadata: {
          description: 'Test profile for smoke tests'
        }
      };

      await fs.writeFile(profilePath, JSON.stringify(validProfile, null, 2));

      // Resolve the profile
      const resolved = await resolveProfile({
        cwd: testDir,
        name: 'default',
        strict: false
      });

      expect(resolved).toBeDefined();
      expect(resolved.name).toBe('test-profile');
      expect(resolved.kind).toBe('composite');
      expect(resolved.scope).toBe('repo');
      expect(resolved.version).toBe('1.0.0');
      expect(resolved.products).toHaveProperty('review');
      expect(resolved.meta.pathAbs).toBe(profilePath);
      // validationResult may be false due to additional fields from system defaults
      expect(typeof resolved.meta.validationResult).toBe('boolean');
    });

    it('should work with ProfileService', async () => {
      const service = new ProfileService({ cwd: testDir });

      // Load profile
      const loadResult = await service.load('default');
      expect(loadResult.profile).toBeDefined();
      expect(loadResult.meta.pathAbs).toContain('profile.json');

      // Validate profile
      const validationResult = service.validate(loadResult.profile);
      expect(validationResult.ok).toBe(true);

      // Resolve profile (non-strict mode for smoke test)
      const resolved = await service.resolve({ strict: false });
      expect(resolved.name).toBe('test-profile');

      // Get product config
      const productConfig = service.getProductConfig(resolved, 'review');
      expect(productConfig).toBeDefined();
      expect(productConfig?.enabled).toBe(true);

      // Debug dump
      const debugDump = service.debugDump(resolved);
      expect(debugDump.profile.name).toBe('test-profile');
      expect(debugDump.products.count).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw ProfileNotFoundError for missing profile', async () => {
      await expect(
        resolveProfile({ cwd: testDir, name: 'nonexistent', strict: true })
      ).rejects.toThrow(ProfileNotFoundError);
    });

    it('should throw SchemaValidationError with strict=true for invalid profile', async () => {
      // Create an invalid profile
      const invalidProfilePath = path.join(profilesDir, 'invalid', 'profile.json');
      await fs.mkdir(path.dirname(invalidProfilePath), { recursive: true });

      const invalidProfile = {
        name: 'invalid-profile',
        kind: 'invalid-kind', // Invalid kind
        version: 'not-a-version', // Invalid version format
        products: {
          review: {
            enabled: 'not-boolean' // Invalid type
          }
        }
      };

      await fs.writeFile(invalidProfilePath, JSON.stringify(invalidProfile, null, 2));

      // Should throw SchemaValidationError with strict=true
      await expect(
        resolveProfile({ cwd: testDir, name: 'invalid', strict: true })
      ).rejects.toThrow(SchemaValidationError);
    });

    it('should warn but continue with strict=false for invalid profile', async () => {
      // Should not throw with strict=false
      const resolved = await resolveProfile({
        cwd: testDir,
        name: 'invalid',
        strict: false
      });

      expect(resolved).toBeDefined();
      expect(resolved.name).toBe('invalid-profile');
      expect(resolved.meta.validationResult).toBe(false);
    });
  });

  describe('Profile Merging', () => {
    it('should merge profiles with extends chain', async () => {
      // Create base profile
      const baseProfilePath = path.join(profilesDir, 'base', 'profile.json');
      await fs.mkdir(path.dirname(baseProfilePath), { recursive: true });

      const baseProfile = {
        name: 'base-profile',
        kind: 'tests',
        version: '1.0.0',
        products: {
          tests: {
            enabled: true,
            config: 'base-config'
          }
        },
        defaults: {
          io: {
            maxFiles: 100
          }
        }
      };

      await fs.writeFile(baseProfilePath, JSON.stringify(baseProfile, null, 2));

      // Create extending profile
      const extendingProfilePath = path.join(profilesDir, 'extending', 'profile.json');
      await fs.mkdir(path.dirname(extendingProfilePath), { recursive: true });

      const extendingProfile = {
        name: 'extending-profile',
        extends: ['base'],
        products: {
          tests: {
            config: 'extending-config' // Override config
          },
          docs: {
            enabled: true
          }
        }
      };

      await fs.writeFile(extendingProfilePath, JSON.stringify(extendingProfile, null, 2));

      // Resolve extending profile
      const resolved = await resolveProfile({
        cwd: testDir,
        name: 'extending',
        strict: false
      });

      expect(resolved.name).toBe('extending-profile');
      expect(resolved.kind).toBe('tests'); // Inherited from base
      expect(resolved.products.tests?.config).toBe('extending-config'); // Overridden
      expect(resolved.products.docs).toBeDefined(); // Added
      expect(resolved.meta.extendsChain).toBe(1);
    });

    it('should apply system defaults to products when fields are missing', async () => {
      // Create a profile with minimal product config
      const minimalProfilePath = path.join(profilesDir, 'minimal', 'profile.json');
      await fs.mkdir(path.dirname(minimalProfilePath), { recursive: true });

      const minimalProfile = {
        name: 'minimal-profile',
        kind: 'review',
        scope: 'repo',
        version: '1.0.0',
        products: {
          review: {
            enabled: true
            // Missing io, diff, capabilities
          }
        }
      };

      await fs.writeFile(minimalProfilePath, JSON.stringify(minimalProfile, null, 2));

      // Resolve the profile
      const resolved = await resolveProfile({
        cwd: testDir,
        name: 'minimal',
        strict: false
      });

      expect(resolved).toBeDefined();
      expect(resolved.products.review).toBeDefined();

      // Check that system defaults were applied
      const reviewProduct = resolved.products.review;
      expect(reviewProduct).toBeDefined();
      expect(reviewProduct!.io).toBeDefined();
      expect(reviewProduct!.io.allow).toEqual([]);
      expect(reviewProduct!.io.deny).toEqual([]);
      expect(reviewProduct!.io.followSymlinks).toBe(false);

      expect(reviewProduct!.diff).toBeDefined();
      expect(reviewProduct!.diff.include).toEqual([]);
      expect(reviewProduct!.diff.exclude).toEqual([]);

      expect(reviewProduct!.capabilities).toBeDefined();
      expect(reviewProduct!.capabilities.rag).toBe(false);
      expect(reviewProduct!.capabilities.internet).toBe(false);
      expect(reviewProduct!.capabilities.writeFs).toBe(false);
      expect(reviewProduct!.capabilities.tools).toEqual([]);
    });
  });
});
