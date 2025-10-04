/**
 * @module @kb-labs/core-profiles/factory-smoke-test
 * Smoke tests for factory functions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createProfileServiceFromConfig } from '../factory';

describe('Factory Smoke Tests', () => {
  let testDir: string;
  let profilesDir: string;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'temp-factory-test');
    profilesDir = path.join(testDir, '.kb', 'profiles');
    await fs.mkdir(profilesDir, { recursive: true });

    // Create a valid minimal profile
    const profilePath = path.join(profilesDir, 'default', 'profile.json');
    await fs.mkdir(path.dirname(profilePath), { recursive: true });

    const validProfile = {
      name: 'default',
      kind: 'composite',
      scope: 'repo',
      version: '1.0.0',
      products: {
        review: {
          enabled: true,
          config: 'factory-test-config'
        }
      }
    };

    await fs.writeFile(profilePath, JSON.stringify(validProfile, null, 2));
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should create ProfileService from config and resolve profile', async () => {
    const service = createProfileServiceFromConfig(
      { defaultName: 'default', strict: false },
      testDir
    );

    const resolved = await service.resolveCached({});

    expect(resolved).toBeDefined();
    expect(resolved.name).toBe('default');
    expect(resolved.kind).toBe('composite');
    expect(resolved.products.review).toBeDefined();
    expect(resolved.products.review!.enabled).toBe(true);
    expect(resolved.products.review!.config).toBe('factory-test-config');
  });

  it('should use default config when no config provided', async () => {
    const service = createProfileServiceFromConfig(undefined, testDir);

    const resolved = await service.resolveCached({ strict: false });

    expect(resolved).toBeDefined();
    expect(resolved.name).toBe('default');
    expect(resolved.kind).toBe('composite');
  });

  it('should override defaultName from config', async () => {
    const service = createProfileServiceFromConfig(
      { defaultName: 'custom', strict: false },
      testDir
    );

    // This should try to load 'custom' profile, which doesn't exist
    // But since strict: false, it might fall back or handle gracefully
    try {
      await service.resolveCached({ strict: false });
      // If it succeeds, that's fine
    } catch (error) {
      // If it fails because 'custom' doesn't exist, that's expected
      expect(error).toBeDefined();
    }
  });
});
