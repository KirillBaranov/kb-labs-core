import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEnvironmentProvider } from '@kb-labs/core-platform';
import type { ISQLDatabase, SQLQueryResult } from '@kb-labs/core-platform/adapters';
import { EnvironmentManager } from '../environment-manager.js';

class ThrowingSqlDatabase implements ISQLDatabase {
  async query(): Promise<SQLQueryResult> {
    throw new Error('db unavailable');
  }
  async transaction() {
    throw new Error('not implemented');
  }
  async close(): Promise<void> {
    return;
  }
  async exec(): Promise<void> {
    throw new Error('db unavailable');
  }
}

class ExpiredLeasesSqlDatabase implements ISQLDatabase {
  leases = [
    {
      environment_id: 'env-1',
      run_id: 'run-1',
      status: 'active',
      provider: 'docker-cli',
      acquired_at: '2026-01-01T00:00:00.000Z',
      expires_at: '2026-01-01T00:30:00.000Z',
      released_at: null,
      metadata_json: null,
    },
    {
      environment_id: 'env-2',
      run_id: 'run-2',
      status: 'active',
      provider: 'docker-cli',
      acquired_at: '2026-01-01T00:00:00.000Z',
      expires_at: '2026-01-01T00:30:00.000Z',
      released_at: null,
      metadata_json: null,
    },
  ];

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<SQLQueryResult<T>> {
    const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
    if (normalized.startsWith('SELECT') && normalized.includes('FROM ENVIRONMENT_LEASES')) {
      const [nowIso] = params as [string, number];
      const rows = this.leases
        .filter((l) => l.status === 'active' && l.expires_at <= nowIso)
        .map((l) => ({ ...l }));
      return { rows: rows as unknown as T[], rowCount: rows.length };
    }

    if (normalized.startsWith('UPDATE ENVIRONMENT_LEASES SET STATUS')) {
      const [releasedAt, environmentId] = params as [string, string];
      const lease = this.leases.find((l) => l.environment_id === environmentId);
      if (lease) {
        lease.status = 'terminated';
        lease.released_at = releasedAt;
      }
      return { rows: [], rowCount: lease ? 1 : 0 };
    }

    return { rows: [], rowCount: 0 };
  }

  async transaction() {
    throw new Error('not implemented');
  }
  async close(): Promise<void> {
    return;
  }
  async exec(): Promise<void> {
    return;
  }
}

describe('EnvironmentManager resilience', () => {
  let logger: any;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
    };
  });

  it('does not fail createEnvironment when DB persistence is unavailable', async () => {
    const provider: IEnvironmentProvider = {
      create: vi.fn(async () => ({
        environmentId: 'env-db-fail',
        provider: 'docker-cli',
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      getStatus: vi.fn(),
      destroy: vi.fn(),
    };

    const manager = new EnvironmentManager({
      getAdapter: vi.fn((key: string) => {
        if (key === 'environment') {return provider;}
        if (key === 'db') {return new ThrowingSqlDatabase();}
        return undefined;
      }),
      logger,
    } as any);

    const env = await manager.createEnvironment({ runId: 'run-db-fail' });
    expect(env.environmentId).toBe('env-db-fail');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('continues janitor cleanup on partial provider failures', async () => {
    const db = new ExpiredLeasesSqlDatabase();
    const provider: IEnvironmentProvider = {
      create: vi.fn(),
      getStatus: vi.fn(),
      destroy: vi.fn(async (environmentId: string) => {
        if (environmentId === 'env-1') {
          throw new Error('destroy failed');
        }
      }),
    };

    const manager = new EnvironmentManager({
      getAdapter: vi.fn((key: string) => {
        if (key === 'environment') {return provider;}
        if (key === 'db') {return db;}
        return undefined;
      }),
      logger,
    } as any);

    const cleaned = await manager.cleanupExpiredLeases(new Date('2026-01-01T01:00:00.000Z'));
    expect(cleaned).toBe(1);
    expect(provider.destroy).toHaveBeenCalledTimes(2);
    expect(db.leases.find((l) => l.environment_id === 'env-2')?.status).toBe('terminated');
    expect(logger.warn).toHaveBeenCalled();
  });
});

