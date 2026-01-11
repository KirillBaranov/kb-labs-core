/**
 * @module @kb-labs/core-runtime/__tests__/sql-database-proxy
 *
 * Unit tests for SQLDatabaseProxy - all ISQLDatabase methods:
 * - Query execution with parameters
 * - Transaction management (begin, commit, rollback)
 * - Connection lifecycle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SQLDatabaseProxy } from '../proxy/sql-database-proxy.js';
import type { ITransport } from '@kb-labs/core-ipc';
import type { AdapterResponse } from '@kb-labs/core-platform/serializable';
import { serialize } from '@kb-labs/core-platform/serializable';

// Helper to create mock response
function mockResponse<T>(result: T): AdapterResponse {
  return {
    type: 'adapter:response',
    requestId: 'test-123',
    result: result === undefined ? undefined : serialize(result),
  };
}

function mockErrorResponse(error: Error): AdapterResponse {
  return {
    type: 'adapter:response',
    requestId: 'test-123',
    error: serialize(error) as any,
  };
}

describe('SQLDatabaseProxy', () => {
  let sqlProxy: SQLDatabaseProxy;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSend = vi.fn();

    const mockTransport: ITransport = {
      send: mockSend,
      close: vi.fn().mockResolvedValue(undefined),
      isClosed: vi.fn().mockReturnValue(false),
    } as any;

    sqlProxy = new SQLDatabaseProxy(mockTransport);
  });

  describe('Query Operations', () => {
    it('should execute SELECT query via IPC', async () => {
      const mockResult = {
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        rowCount: 2,
        fields: [
          { name: 'id', type: 'INTEGER' },
          { name: 'name', type: 'TEXT' },
        ],
      };
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await sqlProxy.query<{ id: number; name: string }>(
        'SELECT id, name FROM users WHERE age > ?',
        [18]
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].adapter).toBe('database.sql');
      expect(mockSend.mock.calls[0][0].method).toBe('query');
      expect(result.rows).toHaveLength(2);
      expect(result.rowCount).toBe(2);
      expect(result.fields).toHaveLength(2);
    });

    it('should execute INSERT query via IPC', async () => {
      const mockResult = {
        rows: [],
        rowCount: 1,
        fields: [],
      };
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await sqlProxy.query('INSERT INTO users (name, age) VALUES (?, ?)', [
        'Charlie',
        30,
      ]);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result.rowCount).toBe(1);
    });

    it('should handle query with no parameters', async () => {
      const mockResult = {
        rows: [{ count: 5 }],
        rowCount: 1,
        fields: [{ name: 'count', type: 'INTEGER' }],
      };
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await sqlProxy.query('SELECT COUNT(*) as count FROM users');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result.rows[0]).toEqual({ count: 5 });
    });
  });

  describe('Transaction Management', () => {
    it('should create transaction and execute queries', async () => {
      const txId = 'tx-12345';
      mockSend
        .mockResolvedValueOnce(mockResponse(txId)) // transaction() call
        .mockResolvedValueOnce(
          mockResponse({
            // tx.query() call
            rows: [],
            rowCount: 1,
            fields: [],
          })
        );

      const tx = await sqlProxy.transaction();

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].method).toBe('transaction');

      const result = await tx.query('INSERT INTO users (name) VALUES (?)', ['David']);

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[1][0].method).toBe('transaction.query');
      expect(mockSend.mock.calls[1][0].args[0]).toBe(txId);
      expect(result.rowCount).toBe(1);
    });

    it('should commit transaction', async () => {
      const txId = 'tx-12345';
      mockSend
        .mockResolvedValueOnce(mockResponse(txId)) // transaction()
        .mockResolvedValueOnce(mockResponse(undefined)); // commit()

      const tx = await sqlProxy.transaction();
      await tx.commit();

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[1][0].method).toBe('transaction.commit');
      expect(mockSend.mock.calls[1][0].args[0]).toBe(txId);
    });

    it('should rollback transaction', async () => {
      const txId = 'tx-12345';
      mockSend
        .mockResolvedValueOnce(mockResponse(txId)) // transaction()
        .mockResolvedValueOnce(mockResponse(undefined)); // rollback()

      const tx = await sqlProxy.transaction();
      await tx.rollback();

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[1][0].method).toBe('transaction.rollback');
      expect(mockSend.mock.calls[1][0].args[0]).toBe(txId);
    });

    it('should execute multiple queries in transaction', async () => {
      const txId = 'tx-12345';
      mockSend
        .mockResolvedValueOnce(mockResponse(txId)) // transaction()
        .mockResolvedValueOnce(
          mockResponse({
            // query 1
            rows: [],
            rowCount: 1,
            fields: [],
          })
        )
        .mockResolvedValueOnce(
          mockResponse({
            // query 2
            rows: [],
            rowCount: 1,
            fields: [],
          })
        )
        .mockResolvedValueOnce(mockResponse(undefined)); // commit()

      const tx = await sqlProxy.transaction();

      await tx.query('INSERT INTO users (name) VALUES (?)', ['Alice']);
      await tx.query('INSERT INTO audit_log (action) VALUES (?)', ['user_created']);
      await tx.commit();

      expect(mockSend).toHaveBeenCalledTimes(4);
      expect(mockSend.mock.calls[1][0].method).toBe('transaction.query');
      expect(mockSend.mock.calls[2][0].method).toBe('transaction.query');
      expect(mockSend.mock.calls[3][0].method).toBe('transaction.commit');
    });
  });

  describe('Connection Lifecycle', () => {
    it('should close database connection', async () => {
      mockSend.mockResolvedValue(mockResponse(undefined));

      await sqlProxy.close();

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].adapter).toBe('database.sql');
      expect(mockSend.mock.calls[0][0].method).toBe('close');
    });
  });

  describe('Error Handling', () => {
    it('should propagate query errors', async () => {
      const error = new Error('SQL syntax error');
      mockSend.mockResolvedValue(mockErrorResponse(error));

      await expect(sqlProxy.query('INVALID SQL')).rejects.toThrow('SQL syntax error');
    });

    it('should propagate transaction errors', async () => {
      const error = new Error('Transaction failed');
      mockSend.mockResolvedValue(mockErrorResponse(error));

      await expect(sqlProxy.transaction()).rejects.toThrow('Transaction failed');
    });
  });
});
