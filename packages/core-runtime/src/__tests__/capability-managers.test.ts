import { describe, it, expect, vi } from 'vitest';
import { PlatformContainer } from '../container.js';
import { WorkspaceManager } from '../workspace-manager.js';
import { SnapshotManager } from '../snapshot-manager.js';
import type { IWorkspaceProvider, ISnapshotProvider } from '@kb-labs/core-platform';

describe('WorkspaceManager', () => {
  it('throws when provider is missing', async () => {
    const manager = new WorkspaceManager({
      getAdapter: vi.fn((_key: string) => undefined),
    } as any);

    await expect(manager.getWorkspaceStatus('ws-1')).rejects.toThrow(
      'Workspace provider not configured'
    );
  });

  it('materializes workspace via provider', async () => {
    const provider: IWorkspaceProvider = {
      materialize: vi.fn(async () => ({
        workspaceId: 'ws-1',
        provider: 'workspace-test',
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      attach: vi.fn(),
      release: vi.fn(),
      getStatus: vi.fn(),
      getCapabilities: vi.fn(() => ({ supportsAttach: true })),
    };

    const manager = new WorkspaceManager({
      getAdapter: vi.fn((key: string) => (key === 'workspace' ? provider : undefined)),
    } as any);

    const workspace = await manager.materializeWorkspace({ tenantId: 'tenant-1' });
    expect(workspace.workspaceId).toBe('ws-1');
    expect(provider.materialize).toHaveBeenCalledTimes(1);
    expect(manager.getCapabilities().supportsAttach).toBe(true);
  });
});

describe('SnapshotManager', () => {
  it('throws when provider is missing', async () => {
    const manager = new SnapshotManager({
      getAdapter: vi.fn((_key: string) => undefined),
    } as any);

    await expect(manager.getSnapshotStatus('snap-1')).rejects.toThrow(
      'Snapshot provider not configured'
    );
  });

  it('captures snapshot and fails gc when unsupported', async () => {
    const provider: ISnapshotProvider = {
      capture: vi.fn(async () => ({
        snapshotId: 'snap-1',
        provider: 'snapshot-test',
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      restore: vi.fn(),
      getStatus: vi.fn(),
      delete: vi.fn(),
      getCapabilities: vi.fn(() => ({ supportsWorkspaceSnapshots: true })),
    };

    const manager = new SnapshotManager({
      getAdapter: vi.fn((key: string) => (key === 'snapshot' ? provider : undefined)),
    } as any);

    const snapshot = await manager.captureSnapshot({ workspaceId: 'ws-1' });
    expect(snapshot.snapshotId).toBe('snap-1');
    expect(provider.capture).toHaveBeenCalledTimes(1);
    await expect(manager.garbageCollectSnapshots()).rejects.toThrow(
      'Configured snapshot provider does not support garbage collection'
    );
  });
});

describe('PlatformContainer capability services', () => {
  it('adds workspace/snapshot managers to configured services', () => {
    const container = new PlatformContainer();
    container.initCapabilityServices(
      new WorkspaceManager(container),
      new SnapshotManager(container)
    );

    const configured = container.getConfiguredServices();
    expect(configured.has('workspaceManager')).toBe(true);
    expect(configured.has('snapshotManager')).toBe(true);
  });
});
