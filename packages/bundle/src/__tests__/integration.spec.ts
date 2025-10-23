/**
 * @module @kb-labs/core-bundle/__tests__/integration.spec.ts
 * Integration tests for the complete bundle system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { loadBundle, explainBundle, clearCaches } from '../index';

describe('Bundle Integration Tests', () => {
  let testDir: string;
  let fixtureDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `kb-labs-bundle-integration-${Date.now()}`);
    fixtureDir = path.join(__dirname, '../__fixtures__/workspace');
    
    // Copy fixture workspace to test directory
    await fsp.mkdir(testDir, { recursive: true });
    await copyDir(fixtureDir, testDir);
    
    clearCaches();
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
    clearCaches();
  });

  describe('Full Bundle Loading', () => {
    it('should load complete bundle with all layers', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      expect(bundle.product).toBe('aiReview');
      expect(bundle.config).toBeDefined();
      expect(bundle.profile).toBeDefined();
      expect(bundle.artifacts).toBeDefined();
      expect(bundle.policy).toBeDefined();
      expect(bundle.trace).toBeDefined();
    });

    it('should resolve profile correctly', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      expect(bundle.profile.key).toBe('default');
      expect(bundle.profile.name).toBe('node-ts-lib');
      expect(bundle.profile.version).toBe('1.2.0');
    });

    it('should merge configuration layers correctly', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      // Should have merged config from all layers
      expect(bundle.config).toBeDefined();
      
      // Check that local config overrides workspace config
      const config = bundle.config as any;
      expect(config.maxFiles).toBe(25); // From local config
      expect(config.debug).toBe(true); // From local config
    });

    it('should provide artifacts summary', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      expect(bundle.artifacts.summary).toBeDefined();
      expect(bundle.artifacts.summary['ai-review']).toBeDefined();
      expect(bundle.artifacts.summary['ai-review']).toContain('rules');
      expect(bundle.artifacts.summary['ai-review']).toContain('prompts');
    });

    it('should provide policy permits function', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      expect(bundle.policy.permits).toBeDefined();
      expect(typeof bundle.policy.permits).toBe('function');
    });

    it('should provide detailed trace', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      expect(bundle.trace).toBeDefined();
      expect(Array.isArray(bundle.trace)).toBe(true);
      expect(bundle.trace.length).toBeGreaterThan(0);
    });
  });

  describe('Artifact Management', () => {
    it('should list artifacts for a product', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      const rules = await bundle.artifacts.list('rules');
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      
      // Check artifact structure
      const artifact = rules[0];
      expect(artifact.relPath).toBeDefined();
      expect(artifact.sha256).toBeDefined();
    });

    it('should materialize artifacts', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      const result = await bundle.artifacts.materialize(['rules', 'prompts']);
      
      expect(result.filesCopied).toBeGreaterThan(0);
      expect(result.filesSkipped).toBeGreaterThanOrEqual(0);
      expect(result.bytesWritten).toBeGreaterThan(0);
    });

    it('should handle artifact security constraints', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      // Should only allow whitelisted file types
      const rules = await bundle.artifacts.list('rules');
      for (const artifact of rules) {
        const ext = path.extname(artifact.relPath).toLowerCase();
        expect(['.yml', '.yaml', '.md', '.txt', '.json']).toContain(ext);
      }
    });
  });

  describe('Policy System', () => {
    it('should check permissions correctly', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      // Should have permits function
      expect(bundle.policy.permits).toBeDefined();
      
      // Test permission checks
      const canRun = bundle.policy.permits('aiReview.run');
      expect(typeof canRun).toBe('boolean');
    });

    it('should handle permit-all mode', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      // In permit-all mode, all actions should be allowed
      expect(bundle.policy.permits('aiReview.run')).toBe(true);
      expect(bundle.policy.permits('release.publish')).toBe(true);
    });
  });

  describe('Configuration Explanation', () => {
    it('should explain configuration resolution', async () => {
      const trace = await explainBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      expect(trace).toBeDefined();
      expect(Array.isArray(trace)).toBe(true);
      expect(trace.length).toBeGreaterThan(0);
      
      // Check trace structure
      const step = trace[0];
      expect(step.layer).toBeDefined();
      expect(step.source).toBeDefined();
    });

    it('should show layer names in trace', async () => {
      const trace = await explainBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      const layers = trace.map(step => step.layer);
      expect(layers).toContain('runtime');
      expect(layers).toContain('profile');
      expect(layers).toContain('workspace');
      expect(layers).toContain('local');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing workspace config', async () => {
      // Remove workspace config
      await fsp.rm(path.join(testDir, 'kb-labs.config.yaml'));
      
      await expect(loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      })).rejects.toThrow();
    });

    it('should handle missing profile', async () => {
      await expect(loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'nonexistent'
      })).rejects.toThrow();
    });

    it('should handle invalid product', async () => {
      await expect(loadBundle({
        cwd: testDir,
        product: 'invalid' as any,
        profileKey: 'default'
      })).rejects.toThrow();
    });
  });

  describe('CLI Integration', () => {
    it('should work with CLI overrides', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default',
        cli: { debug: false, maxFiles: 10 }
      });

      const config = bundle.config as any;
      expect(config.debug).toBe(false); // CLI override
      expect(config.maxFiles).toBe(10); // CLI override
    });

    it('should write final config when requested', async () => {
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default',
        writeFinalConfig: true
      });

      // Check that final config was written
      const finalConfigPath = path.join(testDir, '.kb', 'ai-review', 'ai-review.config.json');
      const finalConfig = await fsp.readFile(finalConfigPath, 'utf-8');
      const parsed = JSON.parse(finalConfig);
      
      expect(parsed.schemaVersion).toBe('1.0');
      expect(parsed.product).toBe('aiReview');
    });
  });

  describe('Cache Management', () => {
    it('should clear caches correctly', async () => {
      // Load bundle to populate cache
      await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      // Clear caches
      clearCaches();

      // Should still work after clearing caches
      const bundle = await loadBundle({
        cwd: testDir,
        product: 'aiReview',
        profileKey: 'default'
      });

      expect(bundle).toBeDefined();
    });
  });
});

// Helper function to copy directory recursively
async function copyDir(src: string, dest: string): Promise<void> {
  await fsp.mkdir(dest, { recursive: true });
  
  const entries = await fsp.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}
