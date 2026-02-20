import { describe, it, expect, vi } from 'vitest';
import { EnvironmentManager } from '../environment-manager.js';
import { RunExecutor } from '../run-executor.js';
import { RunOrchestrator } from '../run-orchestrator.js';
import type { IEnvironmentProvider } from '@kb-labs/core-platform';

describe('EnvironmentManager', () => {
  it('throws when provider is missing', async () => {
    const manager = new EnvironmentManager({
      getAdapter: vi.fn((_key: string) => undefined),
      logger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn(), trace: vi.fn(), fatal: vi.fn() } as any,
    } as any);

    await expect(manager.getEnvironmentStatus('env-1')).rejects.toThrow(
      'Environment provider not configured'
    );
  });

  it('creates environment via provider', async () => {
    const provider: IEnvironmentProvider = {
      create: vi.fn(async () => ({
        environmentId: 'env-1',
        provider: 'test-provider',
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      getStatus: vi.fn(),
      destroy: vi.fn(),
    };

    const manager = new EnvironmentManager({
      getAdapter: vi.fn((key: string) => (key === 'environment' ? provider : undefined)),
      logger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn(), trace: vi.fn(), fatal: vi.fn() } as any,
    } as any);

    const env = await manager.createEnvironment({ runId: 'run-1' });
    expect(env.environmentId).toBe('env-1');
    expect(provider.create).toHaveBeenCalledTimes(1);
  });
});

describe('RunExecutor', () => {
  it('enriches descriptor with run context', async () => {
    const executionBackend = {
      execute: vi.fn(async (request) => ({
        ok: true,
        data: request.descriptor,
        executionTimeMs: 1,
      })),
      shutdown: vi.fn(async () => undefined),
    };

    const executor = new RunExecutor(
      executionBackend as any,
      { debug: vi.fn() }
    );

    const result = await executor.executeStep({
      runId: 'run-1',
      stepId: 'step-1',
      environmentId: 'env-1',
      execution: {
        executionId: 'exec-1',
        descriptor: { scope: 'test' },
        pluginRoot: '/tmp/plugin',
        handlerRef: 'handler.js',
        input: { ok: true },
      },
    });

    expect(result.ok).toBe(true);
    expect((result.data as any).run.runId).toBe('run-1');
    expect((result.data as any).run.environmentId).toBe('env-1');
  });
});

describe('RunOrchestrator', () => {
  it('runs minimal full-cycle happy path', async () => {
    const environmentManager = {
      createEnvironment: vi.fn(async () => ({
        environmentId: 'env-1',
        provider: 'test',
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      destroyEnvironment: vi.fn(async () => undefined),
    };

    const runExecutor = {
      executeStep: vi.fn(async () => ({ ok: true, executionTimeMs: 1 })),
    };

    const orchestrator = new RunOrchestrator(
      environmentManager as any,
      runExecutor as any,
      { debug: vi.fn() }
    );

    const run = await orchestrator.startFullCycle({
      run: {
        taskRef: 'TASK-1',
        templateId: 'full-cycle.default',
      },
      environment: {},
      firstStep: {
        executionId: 'exec-1',
        descriptor: {},
        pluginRoot: '/tmp/plugin',
        handlerRef: 'handler.js',
        input: {},
      },
    });

    expect(run.status).toBe('completed');
    expect(run.environmentId).toBe('env-1');
    expect(runExecutor.executeStep).toHaveBeenCalledTimes(1);
  });

  it('marks run as failed and cleans up environment on step error', async () => {
    const environmentManager = {
      createEnvironment: vi.fn(async () => ({
        environmentId: 'env-fail-1',
        provider: 'test',
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      destroyEnvironment: vi.fn(async () => undefined),
    };

    const runExecutor = {
      executeStep: vi.fn(async () => {
        throw new Error('step failed');
      }),
    };

    const orchestrator = new RunOrchestrator(
      environmentManager as any,
      runExecutor as any,
      { debug: vi.fn() }
    );

    await expect(
      orchestrator.startFullCycle({
        run: {
          taskRef: 'TASK-FAIL',
          templateId: 'full-cycle.default',
        },
        environment: {},
        firstStep: {
          executionId: 'exec-fail-1',
          descriptor: {},
          pluginRoot: '/tmp/plugin',
          handlerRef: 'handler.js',
          input: {},
        },
      })
    ).rejects.toThrow('step failed');

    expect(environmentManager.destroyEnvironment).toHaveBeenCalledTimes(1);
  });

  it('fails on provisioning error without cleanup call', async () => {
    const environmentManager = {
      createEnvironment: vi.fn(async () => {
        throw new Error('provision failed');
      }),
      destroyEnvironment: vi.fn(async () => undefined),
    };

    const runExecutor = {
      executeStep: vi.fn(async () => ({ ok: true, executionTimeMs: 1 })),
    };

    const orchestrator = new RunOrchestrator(
      environmentManager as any,
      runExecutor as any,
      { debug: vi.fn() }
    );

    await expect(
      orchestrator.startFullCycle({
        run: {
          taskRef: 'TASK-PROVISION-FAIL',
          templateId: 'full-cycle.default',
        },
        environment: {},
      })
    ).rejects.toThrow('provision failed');

    expect(runExecutor.executeStep).not.toHaveBeenCalled();
    expect(environmentManager.destroyEnvironment).not.toHaveBeenCalled();
  });
});
