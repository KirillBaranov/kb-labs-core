/**
 * @module @kb-labs/core-profiles/core-integration-test
 * Integration test for core profiles
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ProfileService, resolveProfile } from '../index';

describe('Core Integration', () => {
  const testDir = path.join(__dirname, '..', '..', '..', '..', '.test-tmp-core');
  const profilesDir = path.join(testDir, '.kb', 'profiles');

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(profilesDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should import ProfileService from @kb-labs/core and resolve a profile', async () => {
    // Create a valid profile
    const profilePath = path.join(profilesDir, 'default', 'profile.json');
    await fs.mkdir(path.dirname(profilePath), { recursive: true });

    const validProfile = {
      name: 'core-test-profile',
      kind: 'review',
      scope: 'repo',
      version: '1.0.0',
      products: {
        review: {
          enabled: true,
          config: 'core-test-config'
        }
      }
    };

    await fs.writeFile(profilePath, JSON.stringify(validProfile, null, 2));

    // Test ProfileService from @kb-labs/core
    const service = new ProfileService({ cwd: testDir });
    const resolved = await service.resolve({ strict: false });

    expect(resolved).toBeDefined();
    expect(resolved.name).toBe('core-test-profile');
    expect(resolved.kind).toBe('review');
    expect(resolved.products.review).toBeDefined();
    expect(resolved.products.review!.enabled).toBe(true);

    // Check that extra metadata is present
    expect(resolved.meta.extra).toBeDefined();
    expect(resolved.meta.extra!.createdAt).toBeDefined();
    expect(resolved.meta.extra!.resolver.version).toBe('0.1.0');
    expect(resolved.meta.extra!.trace.stages).toBeDefined();
    expect(typeof resolved.meta.extra!.trace.stages!.load).toBe('number');
    expect(typeof resolved.meta.extra!.trace.stages!.merge).toBe('number');
    expect(typeof resolved.meta.extra!.trace.stages!.validate).toBe('number');
  });

  it('should import resolveProfile directly from @kb-labs/core', async () => {
    const resolved = await resolveProfile({
      cwd: testDir,
      name: 'default',
      strict: false
    });

    expect(resolved).toBeDefined();
    expect(resolved.name).toBe('core-test-profile');
    expect(resolved.meta.extra).toBeDefined();
  });
});
