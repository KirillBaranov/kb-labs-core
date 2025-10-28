/**
 * @module @kb-labs/core/config/__tests__/upsert-lockfile.spec.ts
 * Tests for upsert lockfile operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { upsertLockfile } from '../api/upsert-lockfile';
import { readLockfile, writeLockfile } from '../lockfile/lockfile';
import { ensureWithinWorkspace } from '../utils/fs-atomic';
import { KbError } from '../errors/kb-error';

// Mock fs-atomic to test workspace validation
vi.mock('../utils/fs-atomic', () => ({
  ensureWithinWorkspace: vi.fn(),
}));

// Mock lockfile operations
vi.mock('../lockfile/lockfile', () => ({
  readLockfile: vi.fn(),
  writeLockfile: vi.fn(),
}));

describe('upsertLockfile', () => {
  let testDir: string;
  const mockEnsureWithinWorkspace = vi.mocked(ensureWithinWorkspace);
  const mockReadLockfile = vi.mocked(readLockfile);
  const mockWriteLockfile = vi.mocked(writeLockfile);

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `kb-labs-upsert-test-${Date.now()}`);
    await fsp.mkdir(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  describe('lockfile creation', () => {
    it('should create new lockfile when none exists', async () => {
      mockReadLockfile.mockResolvedValue(null);
      mockWriteLockfile.mockResolvedValue(undefined);

      const result = await upsertLockfile({
        cwd: testDir,
        presetRef: 'org/preset',
        profileRef: 'profile-name',
        policyBundle: 'bundle-name',
        dryRun: false,
      });

      expect(result.created).toContain(path.join(testDir, '.kb', 'lock.json'));
      expect(result.actions).toContainEqual({
        kind: 'write',
        path: path.join(testDir, '.kb', 'lock.json'),
      });
      expect(result.updated).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);

      expect(mockEnsureWithinWorkspace).toHaveBeenCalledWith(
        path.join(testDir, '.kb', 'lock.json'),
        testDir
      );
      expect(mockWriteLockfile).toHaveBeenCalledWith(testDir, expect.objectContaining({
        $schema: 'https://schemas.kb-labs.dev/lockfile.schema.json',
        schemaVersion: '1.0',
        orgPreset: 'org/preset',
        profile: 'profile-name',
        policyBundle: 'bundle-name',
        hashes: {},
        generatedAt: expect.any(String),
      }));
    });

    it('should create lockfile in dry-run mode without writing', async () => {
      mockReadLockfile.mockResolvedValue(null);

      const result = await upsertLockfile({
        cwd: testDir,
        presetRef: 'org/preset',
        dryRun: true,
      });

      expect(result.created).toContain(path.join(testDir, '.kb', 'lock.json'));
      expect(result.actions).toContainEqual({
        kind: 'write',
        path: path.join(testDir, '.kb', 'lock.json'),
      });
      expect(mockWriteLockfile).not.toHaveBeenCalled();
    });

    it('should create lockfile with minimal options', async () => {
      mockReadLockfile.mockResolvedValue(null);
      mockWriteLockfile.mockResolvedValue(undefined);

      const result = await upsertLockfile({
        cwd: testDir,
        dryRun: false,
      });

      expect(result.created).toContain(path.join(testDir, '.kb', 'lock.json'));
      expect(mockWriteLockfile).toHaveBeenCalledWith(testDir, expect.objectContaining({
        orgPreset: undefined,
        profile: undefined,
        policyBundle: undefined,
        hashes: {},
      }));
    });
  });

  describe('lockfile updates', () => {
    it('should update existing lockfile', async () => {
      const existingLockfile = {
        $schema: 'https://schemas.kb-labs.dev/lockfile.schema.json',
        schemaVersion: '1.0',
        orgPreset: 'old/preset',
        profile: 'old-profile',
        policyBundle: 'old-bundle',
        hashes: { 'old-hash': 'value' },
        generatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockReadLockfile.mockResolvedValue(existingLockfile);
      mockWriteLockfile.mockResolvedValue(undefined);

      const result = await upsertLockfile({
        cwd: testDir,
        presetRef: 'new/preset',
        profileRef: 'new-profile',
        policyBundle: 'new-bundle',
        dryRun: false,
      });

      expect(result.updated).toContain(path.join(testDir, '.kb', 'lock.json'));
      expect(result.actions).toContainEqual({
        kind: 'update',
        path: path.join(testDir, '.kb', 'lock.json'),
      });
      expect(result.created).toHaveLength(0);

      expect(mockWriteLockfile).toHaveBeenCalledWith(testDir, expect.objectContaining({
        orgPreset: 'new/preset',
        profile: 'new-profile',
        policyBundle: 'new-bundle',
        hashes: { 'old-hash': 'value' }, // Preserve existing hashes
      }));
    });

    it('should preserve existing values when not provided', async () => {
      const existingLockfile = {
        $schema: 'https://schemas.kb-labs.dev/lockfile.schema.json',
        schemaVersion: '1.0',
        orgPreset: 'existing/preset',
        profile: 'existing-profile',
        policyBundle: 'existing-bundle',
        hashes: { 'existing-hash': 'value' },
        generatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockReadLockfile.mockResolvedValue(existingLockfile);
      mockWriteLockfile.mockResolvedValue(undefined);

      const result = await upsertLockfile({
        cwd: testDir,
        dryRun: false,
      });

      expect(mockWriteLockfile).toHaveBeenCalledWith(testDir, expect.objectContaining({
        orgPreset: 'existing/preset',
        profile: 'existing-profile',
        policyBundle: 'existing-bundle',
        hashes: { 'existing-hash': 'value' },
      }));
    });

    it('should handle undefined values correctly', async () => {
      const existingLockfile = {
        $schema: 'https://schemas.kb-labs.dev/lockfile.schema.json',
        schemaVersion: '1.0',
        orgPreset: 'existing/preset',
        profile: 'existing-profile',
        policyBundle: 'existing-bundle',
        hashes: {},
        generatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockReadLockfile.mockResolvedValue(existingLockfile);
      mockWriteLockfile.mockResolvedValue(undefined);

      const result = await upsertLockfile({
        cwd: testDir,
        presetRef: undefined, // Explicitly undefined
        profileRef: undefined,
        policyBundle: undefined,
        dryRun: false,
      });

      // When undefined is passed, it should preserve existing values
      expect(mockWriteLockfile).toHaveBeenCalledWith(testDir, expect.objectContaining({
        orgPreset: 'existing/preset',
        profile: 'existing-profile',
        policyBundle: 'existing-bundle',
      }));
    });
  });

  describe('deprecated lockfile detection', () => {
    it('should warn about deprecated lockfile.json', async () => {
      // Create old lockfile
      await fsp.mkdir(path.join(testDir, '.kb'), { recursive: true });
      await fsp.writeFile(
        path.join(testDir, '.kb', 'lockfile.json'),
        JSON.stringify({ old: 'format' })
      );

      mockReadLockfile.mockResolvedValue(null);
      mockWriteLockfile.mockResolvedValue(undefined);

      const result = await upsertLockfile({
        cwd: testDir,
        dryRun: false,
      });

      expect(result.warnings).toContain(
        'Deprecated lockfile found at .kb/lockfile.json, please migrate to .kb/lock.json'
      );
    });

    it('should not warn when no old lockfile exists', async () => {
      mockReadLockfile.mockResolvedValue(null);
      mockWriteLockfile.mockResolvedValue(undefined);

      const result = await upsertLockfile({
        cwd: testDir,
        dryRun: false,
      });

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('workspace boundary validation', () => {
    it('should validate workspace boundaries', async () => {
      mockReadLockfile.mockResolvedValue(null);
      mockEnsureWithinWorkspace.mockImplementation(() => {
        throw new KbError(
          'ERR_PATH_OUTSIDE_WORKSPACE',
          'Refusing to write outside workspace',
          'Check cwd or use a relative path within the workspace',
          { targetPath: 'outside', workspaceRoot: testDir }
        );
      });

      await expect(
        upsertLockfile({
          cwd: testDir,
          dryRun: false,
        })
      ).rejects.toThrow(KbError);

      expect(mockEnsureWithinWorkspace).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate readLockfile errors', async () => {
      const error = new Error('Read error');
      mockReadLockfile.mockRejectedValue(error);
      mockEnsureWithinWorkspace.mockImplementation(() => {}); // Don't throw workspace error

      await expect(
        upsertLockfile({
          cwd: testDir,
          dryRun: false,
        })
      ).rejects.toThrow('Read error');
    });

    it('should propagate writeLockfile errors', async () => {
      mockReadLockfile.mockResolvedValue(null);
      mockEnsureWithinWorkspace.mockImplementation(() => {}); // Don't throw workspace error
      const error = new Error('Write error');
      mockWriteLockfile.mockRejectedValue(error);

      await expect(
        upsertLockfile({
          cwd: testDir,
          dryRun: false,
        })
      ).rejects.toThrow('Write error');
    });
  });

  describe('path resolution', () => {
    it('should resolve relative paths correctly', async () => {
      const relativeDir = './test-relative';
      const absoluteDir = path.resolve(testDir, relativeDir);
      await fsp.mkdir(absoluteDir, { recursive: true });

      mockReadLockfile.mockResolvedValue(null);
      mockWriteLockfile.mockResolvedValue(undefined);
      mockEnsureWithinWorkspace.mockImplementation(() => {}); // Don't throw workspace error

      const result = await upsertLockfile({
        cwd: relativeDir,
        dryRun: false,
      });

      expect(mockEnsureWithinWorkspace).toHaveBeenCalledWith(
        expect.stringContaining('.kb/lock.json'),
        expect.stringContaining('test-relative')
      );
    });
  });
});
