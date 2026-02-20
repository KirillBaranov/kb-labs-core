import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IEnvironmentProvider } from '@kb-labs/core-platform';
import type { ISQLDatabase, SQLQueryResult } from '@kb-labs/core-platform/adapters';
import { EnvironmentManager } from '../environment-manager.js';

interface LeaseRow {
  environment_id: string;
  run_id: string | null;
  status: string;
  provider: string;
  acquired_at: string;
  expires_at: string;
  released_at: string | null;
  metadata_json: string | null;
}

interface EventRow {
  id: string;
  environment_id: string;
  run_id: string | null;
  type: string;
  at: string;
  reason: string | null;
  payload_json: string | null;
}

class FakeSqlDatabase implements ISQLDatabase {
  leases: LeaseRow[] = [];
  events: EventRow[] = [];

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<SQLQueryResult<T>> {
    const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();

    if (normalized.startsWith('INSERT INTO ENVIRONMENT_LEASES')) {
      const [environmentId, runId, status, provider, acquiredAt, expiresAt, releasedAt, metadataJson] = params as [
        string,
        string | null,
        string,
        string,
        string,
        string,
        string | null,
        string | null,
      ];

      const existing = this.leases.find((l) => l.environment_id === environmentId);
      if (existing) {
        existing.run_id = runId;
        existing.status = status;
        existing.provider = provider;
        existing.acquired_at = acquiredAt;
        existing.expires_at = expiresAt;
        existing.released_at = releasedAt;
        existing.metadata_json = metadataJson;
      } else {
        this.leases.push({
          environment_id: environmentId,
          run_id: runId,
          status,
          provider,
          acquired_at: acquiredAt,
          expires_at: expiresAt,
          released_at: releasedAt,
          metadata_json: metadataJson,
        });
      }
      return { rows: [], rowCount: 1 };
    }

    if (normalized.startsWith('INSERT INTO ENVIRONMENT_EVENTS')) {
      const [id, environmentId, runId, type, at, reason, payloadJson] = params as [
        string,
        string,
        string | null,
        string,
        string,
        string | null,
        string | null,
      ];
      this.events.push({
        id,
        environment_id: environmentId,
        run_id: runId,
        type,
        at,
        reason,
        payload_json: payloadJson,
      });
      return { rows: [], rowCount: 1 };
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

    if (normalized.startsWith('SELECT') && normalized.includes('FROM ENVIRONMENT_LEASES')) {
      const [nowIso] = params as [string, number];
      const rows = this.leases
        .filter((l) => l.status === 'active' && l.expires_at <= nowIso)
        .map((l) => ({ ...l }));
      return { rows: rows as unknown as T[], rowCount: rows.length };
    }

    return { rows: [], rowCount: 0 };
  }

  async transaction() {
    throw new Error('Not needed for these tests');
  }

  async close(): Promise<void> {
    return;
  }

  async exec(): Promise<void> {
    return;
  }
}

describe('EnvironmentManager persistence integration', () => {
  let db: FakeSqlDatabase;
  let provider: IEnvironmentProvider;
  let manager: EnvironmentManager;

  beforeEach(() => {
    db = new FakeSqlDatabase();
    provider = {
      create: vi.fn(async () => ({
        environmentId: 'env-1',
        provider: 'docker-cli',
        status: 'ready',
        createdAt: '2026-02-17T00:00:00.000Z',
        updatedAt: '2026-02-17T00:00:00.000Z',
        lease: {
          leaseId: 'lease-1',
          acquiredAt: '2026-02-17T00:00:00.000Z',
          expiresAt: '2026-02-17T01:00:00.000Z',
          owner: 'run-1',
        },
      })),
      getStatus: vi.fn(async () => ({
        environmentId: 'env-1',
        status: 'ready',
        updatedAt: '2026-02-17T00:00:00.000Z',
      })),
      destroy: vi.fn(async () => undefined),
      renewLease: vi.fn(async () => ({
        leaseId: 'lease-2',
        acquiredAt: '2026-02-17T01:00:00.000Z',
        expiresAt: '2026-02-17T02:00:00.000Z',
        owner: 'run-1',
      })),
    };

    const platform = {
      getAdapter: vi.fn((key: string) => {
        if (key === 'environment') {return provider;}
        if (key === 'db') {return db;}
        return undefined;
      }),
      logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
        fatal: vi.fn(),
      },
    } as any;

    manager = new EnvironmentManager(platform);
  });

  it('persists lease and created event on createEnvironment', async () => {
    const environment = await manager.createEnvironment({ runId: 'run-1' });

    expect(environment.environmentId).toBe('env-1');
    expect(db.leases).toHaveLength(1);
    expect(db.leases[0]?.environment_id).toBe('env-1');
    expect(db.leases[0]?.status).toBe('active');
    expect(db.events.some((e) => e.type === 'environment.created')).toBe(true);
  });

  it('cleanupExpiredLeases destroys expired environments and marks terminated', async () => {
    db.leases.push({
      environment_id: 'env-expired-1',
      run_id: 'run-expired-1',
      status: 'active',
      provider: 'docker-cli',
      acquired_at: '2026-02-17T00:00:00.000Z',
      expires_at: '2026-02-17T00:30:00.000Z',
      released_at: null,
      metadata_json: null,
    });

    const cleaned = await manager.cleanupExpiredLeases(
      new Date('2026-02-17T01:00:00.000Z')
    );

    expect(cleaned).toBe(1);
    expect(provider.destroy).toHaveBeenCalledWith('env-expired-1', 'lease_expired');
    expect(db.leases[0]?.status).toBe('terminated');
    expect(
      db.events.some(
        (event) =>
          event.environment_id === 'env-expired-1' &&
          event.type === 'environment.destroyed'
      )
    ).toBe(true);
  });
});

