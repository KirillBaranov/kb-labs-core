import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import {
  createKnowledgeClientFromConfig,
  loadKnowledgeConfig,
} from '../knowledge';

const sampleKnowledgeConfig = {
  sources: [
    {
      id: 'repo-code',
      kind: 'code' as const,
      paths: ['src/**/*.ts'],
    },
  ],
  scopes: [
    {
      id: 'default',
      sources: ['repo-code'],
      defaultEngine: 'noop',
    },
  ],
  engines: [
    {
      id: 'noop',
      type: 'none',
    },
  ],
  defaults: {
    maxChunks: 4,
  },
};

describe('knowledge helpers', () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
      tempDir = undefined;
    }
  });

  it('loads knowledge config from kb.config.json', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-core-knowledge-'));
    await fs.writeJson(path.join(tempDir, 'kb.config.json'), {
      knowledge: sampleKnowledgeConfig,
    });

    const config = await loadKnowledgeConfig(tempDir);
    expect(config.sources[0]?.id).toBe('repo-code');
  });

  it('creates a knowledge client using override config', async () => {
    const client = await createKnowledgeClientFromConfig({
      cwd: process.cwd(),
      capabilities: {
        aiReview: {
          productId: 'aiReview',
          allowedIntents: ['summary'],
          allowedScopes: ['default'],
          maxChunks: 2,
        },
      },
      configOverride: sampleKnowledgeConfig,
    });

    const result = await client.query({
      productId: 'aiReview',
      intent: 'summary',
      scopeId: 'default',
      text: 'hello world',
    });

    expect(result.chunks).toHaveLength(0);
  });
});
