/**
 * @module @kb-labs/core/config/__tests__/product-config.spec.ts
 * Tests for product configuration system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { getProductConfig, explainProductConfig } from '../api/product-config';
import { clearCaches } from '../cache/fs-cache';
import { toFsProduct, toConfigProduct, ProductId } from '../utils/product-normalize';
import { KbError } from '../errors/kb-error';

describe('Product Configuration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `kb-labs-config-test-${Date.now()}`);
    await fsp.mkdir(testDir, { recursive: true });
    clearCaches();
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
    clearCaches();
  });

  describe('Product Normalization', () => {
    it('should convert ProductId to filesystem format', () => {
      expect(toFsProduct('aiReview')).toBe('ai-review');
      expect(toFsProduct('aiDocs')).toBe('ai-docs');
      expect(toFsProduct('devlink')).toBe('devlink');
      expect(toFsProduct('release')).toBe('release');
      expect(toFsProduct('devkit')).toBe('devkit');
    });

    it('should convert filesystem format to ProductId', () => {
      expect(toConfigProduct('ai-review')).toBe('aiReview');
      expect(toConfigProduct('ai-docs')).toBe('aiDocs');
      expect(toConfigProduct('devlink')).toBe('devlink');
      expect(toConfigProduct('release')).toBe('release');
      expect(toConfigProduct('devkit')).toBe('devkit');
    });
  });

  describe('getProductConfig', () => {
    it('should return runtime defaults when no config files exist', async () => {
      const result = await getProductConfig({
        cwd: testDir,
        product: 'aiReview',
      }, null);

      expect(result.config).toMatchObject({
        enabled: true,
        rules: [],
      });
      expect(result.trace.length).toBeGreaterThan(0);
      expect(result.trace[0]?.layer).toBe('runtime');
    });

    it('should merge workspace config', async () => {
      // Create workspace config
      const workspaceConfig = {
        schemaVersion: '1.0',
        products: {
          'ai-review': {
            enabled: false,
            customSetting: 'test',
          },
        },
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const result = await getProductConfig({
        cwd: testDir,
        product: 'aiReview',
      }, null);

      expect(result.config).toMatchObject({
        enabled: false,
        customSetting: 'test',
      });
      expect(result.trace.length).toBeGreaterThan(1);
      expect(result.trace.some(t => t.layer === 'workspace')).toBe(true);
    });

    it('should merge local config', async () => {
      // Create local config directory
      const localConfigDir = path.join(testDir, '.kb', 'ai-review');
      await fsp.mkdir(localConfigDir, { recursive: true });

      const localConfig = {
        $schema: 'https://schemas.kb-labs.dev/config.schema.json',
        schemaVersion: '1.0',
        enabled: false,
        localSetting: 'local-value',
      };
      await fsp.writeFile(
        path.join(localConfigDir, 'ai-review.config.json'),
        JSON.stringify(localConfig, null, 2)
      );

      const result = await getProductConfig({
        cwd: testDir,
        product: 'aiReview',
      }, null);

      expect(result.config).toMatchObject({
        enabled: false,
        localSetting: 'local-value',
      });
      expect(result.trace.length).toBeGreaterThan(1);
      expect(result.trace.some(t => t.layer === 'local')).toBe(true);
    });

    it('should merge CLI overrides', async () => {
      const result = await getProductConfig({
        cwd: testDir,
        product: 'aiReview',
        cli: {
          enabled: false,
          debug: true,
        },
      }, null);

      expect(result.config).toMatchObject({
        enabled: false,
        debug: true,
      });
      expect(result.trace.length).toBeGreaterThan(1);
      expect(result.trace.some(t => t.layer === 'cli')).toBe(true);
    });

    it('should handle array overwrite', async () => {
      // Create workspace config with array
      const workspaceConfig = {
        schemaVersion: '1.0',
        products: {
          'ai-review': {
            rules: ['workspace-rule'],
          },
        },
      };
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );

      const result = await getProductConfig({
        cwd: testDir,
        product: 'aiReview',
        cli: {
          rules: ['cli-rule'],
        },
      }, null);

      expect((result.config as any).rules).toEqual(['cli-rule']);
      expect(result.trace.length).toBeGreaterThan(2);
      expect(result.trace.some(t => t.type === 'overwriteArray')).toBe(true);
    });
  });

  describe('explainProductConfig', () => {
    it('should return trace without resolving config', async () => {
      const result = await explainProductConfig({
        cwd: testDir,
        product: 'aiReview',
      }, null);

      expect(result.trace.length).toBeGreaterThan(0);
      expect(result.trace[0].layer).toBe('runtime');
    });
  });

  describe('Error Handling', () => {
    it('should throw KbError for invalid config', async () => {
      // Create invalid JSON config
      await fsp.writeFile(
        path.join(testDir, 'kb-labs.config.json'),
        '{ invalid json }'
      );

      await expect(
        getProductConfig({
          cwd: testDir,
          product: 'aiReview',
        }, null)
      ).rejects.toThrow(KbError);
    });
  });
});
