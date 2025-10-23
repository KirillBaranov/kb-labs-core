/**
 * @module @kb-labs/core-profiles/__tests__/init-profile
 * Smoke tests for initProfile
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { initProfile } from '../api/init-profile';
import os from 'node:os';

describe('initProfile', () => {
  let tmpDir: string;
  
  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `kb-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });
  
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
  
  it('creates local profile scaffold', async () => {
    const result = await initProfile({
      cwd: tmpDir,
      profileKey: 'default',
      createLocalScaffold: true,
      products: ['aiReview'],
    });
    
    expect(result.created.length).toBeGreaterThan(0);
    
    // Check profile.json exists
    const profileJsonPath = path.join(tmpDir, '.kb', 'profiles', 'node-ts-lib', 'profile.json');
    const content = await fs.readFile(profileJsonPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.name).toBe('node-ts-lib');
    expect(parsed.exports).toHaveProperty('ai-review');
    expect(parsed.defaults).toHaveProperty('ai-review');
  });
  
  it('creates artifacts and defaults', async () => {
    await initProfile({
      cwd: tmpDir,
      profileKey: 'default',
      createLocalScaffold: true,
      products: ['aiReview'],
    });
    
    // Check defaults file
    const defaultsPath = path.join(tmpDir, '.kb', 'profiles', 'node-ts-lib', 'defaults', 'ai-review.json');
    const defaultsContent = await fs.readFile(defaultsPath, 'utf-8');
    const defaults = JSON.parse(defaultsContent);
    expect(defaults).toHaveProperty('include');
    expect(defaults).toHaveProperty('exclude');
    
    // Check rules artifact
    const rulesPath = path.join(tmpDir, '.kb', 'profiles', 'node-ts-lib', 'artifacts', 'ai-review', 'rules.yml');
    const rulesContent = await fs.readFile(rulesPath, 'utf-8');
    expect(rulesContent).toContain('version: 1');
    expect(rulesContent).toContain('rules:');
  });
  
  it('auto-renames on conflict', async () => {
    // Create first profile
    await initProfile({
      cwd: tmpDir,
      profileKey: 'default',
      createLocalScaffold: true,
      products: ['aiReview'],
    });
    
    // Create second profile with same name
    const result2 = await initProfile({
      cwd: tmpDir,
      profileKey: 'default2',
      createLocalScaffold: true,
      products: ['aiReview'],
    });
    
    // Second one should be renamed
    expect(result2.warnings.some(w => w.includes('node-ts-lib-2'))).toBe(true);
  });
  
  it('supports dry-run mode', async () => {
    const result = await initProfile({
      cwd: tmpDir,
      profileKey: 'default',
      createLocalScaffold: true,
      products: ['aiReview'],
      dryRun: true,
    });
    
    expect(result.created.length).toBeGreaterThan(0);
    
    // Files should not actually be created
    const profileJsonPath = path.join(tmpDir, '.kb', 'profiles', 'node-ts-lib', 'profile.json');
    await expect(fs.access(profileJsonPath)).rejects.toThrow();
  });
});

