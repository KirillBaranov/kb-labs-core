/**
 * @module @kb-labs/core-runtime/__tests__/document-database-proxy
 *
 * Unit tests for DocumentDatabaseProxy - all IDocumentDatabase methods:
 * - Find operations (find, findById, count)
 * - Insert operations (insertOne with auto-generated fields)
 * - Update operations (updateMany, updateById)
 * - Delete operations (deleteMany, deleteById)
 * - Connection lifecycle (close)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentDatabaseProxy } from '../proxy/document-database-proxy.js';
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

interface User {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  email: string;
  age: number;
}

describe('DocumentDatabaseProxy', () => {
  let docProxy: DocumentDatabaseProxy;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSend = vi.fn();

    const mockTransport: ITransport = {
      send: mockSend,
      close: vi.fn().mockResolvedValue(undefined),
      isClosed: vi.fn().mockReturnValue(false),
    } as any;

    docProxy = new DocumentDatabaseProxy(mockTransport);
  });

  describe('Find Operations', () => {
    it('should find documents with filter', async () => {
      const mockResult: User[] = [
        {
          id: '1',
          createdAt: 1000,
          updatedAt: 1000,
          name: 'Alice',
          email: 'alice@example.com',
          age: 25,
        },
        {
          id: '2',
          createdAt: 2000,
          updatedAt: 2000,
          name: 'Bob',
          email: 'bob@example.com',
          age: 30,
        },
      ];
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await docProxy.find<User>('users', { age: { $gt: 18 } }, { limit: 10 });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].adapter).toBe('database.document');
      expect(mockSend.mock.calls[0][0].method).toBe('find');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
    });

    it('should find document by ID', async () => {
      const mockResult: User = {
        id: '1',
        createdAt: 1000,
        updatedAt: 1000,
        name: 'Alice',
        email: 'alice@example.com',
        age: 25,
      };
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await docProxy.findById<User>('users', '1');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].method).toBe('findById');
      expect(result?.name).toBe('Alice');
      expect(result?.id).toBe('1');
    });

    it('should return null when document not found by ID', async () => {
      mockSend.mockResolvedValue(mockResponse(null));

      const result = await docProxy.findById<User>('users', 'nonexistent');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should count documents with filter', async () => {
      mockSend.mockResolvedValue(mockResponse(5));

      const result = await docProxy.count<User>('users', { age: { $gte: 18 } });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].method).toBe('count');
      expect(result).toBe(5);
    });

    it('should find with empty filter', async () => {
      const mockResult: User[] = [
        {
          id: '1',
          createdAt: 1000,
          updatedAt: 1000,
          name: 'Alice',
          email: 'alice@example.com',
          age: 25,
        },
      ];
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await docProxy.find<User>('users', {});

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('Insert Operations', () => {
    it('should insert one document with auto-generated fields', async () => {
      const mockResult: User = {
        id: 'generated-id-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        name: 'Charlie',
        email: 'charlie@example.com',
        age: 35,
      };
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await docProxy.insertOne<User>('users', {
        name: 'Charlie',
        email: 'charlie@example.com',
        age: 35,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].method).toBe('insertOne');
      expect(result.id).toBe('generated-id-123');
      expect(result.name).toBe('Charlie');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('Update Operations', () => {
    it('should update many documents', async () => {
      mockSend.mockResolvedValue(mockResponse(3));

      const result = await docProxy.updateMany<User>(
        'users',
        { age: { $lt: 18 } },
        { $set: { status: 'minor' } }
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].method).toBe('updateMany');
      expect(result).toBe(3);
    });

    it('should update document by ID', async () => {
      const mockResult: User = {
        id: '1',
        createdAt: 1000,
        updatedAt: Date.now(),
        name: 'Alice Updated',
        email: 'alice@example.com',
        age: 26,
      };
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await docProxy.updateById<User>('users', '1', {
        $set: { name: 'Alice Updated', age: 26 },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].method).toBe('updateById');
      expect(result?.name).toBe('Alice Updated');
      expect(result?.age).toBe(26);
    });

    it('should return null when updating nonexistent document by ID', async () => {
      mockSend.mockResolvedValue(mockResponse(null));

      const result = await docProxy.updateById<User>('users', 'nonexistent', {
        $set: { name: 'Updated' },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle complex update operators', async () => {
      mockSend.mockResolvedValue(mockResponse(2));

      const result = await docProxy.updateMany<User>(
        'users',
        { age: { $gte: 18 } },
        { $inc: { age: 1 }, $set: { verified: true } }
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBe(2);
    });
  });

  describe('Delete Operations', () => {
    it('should delete many documents', async () => {
      mockSend.mockResolvedValue(mockResponse(5));

      const result = await docProxy.deleteMany<User>('users', { age: { $lt: 18 } });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].method).toBe('deleteMany');
      expect(result).toBe(5);
    });

    it('should delete document by ID', async () => {
      mockSend.mockResolvedValue(mockResponse(true));

      const result = await docProxy.deleteById('users', '1');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].method).toBe('deleteById');
      expect(result).toBe(true);
    });

    it('should return false when deleting nonexistent document by ID', async () => {
      mockSend.mockResolvedValue(mockResponse(false));

      const result = await docProxy.deleteById('users', 'nonexistent');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });

    it('should delete all documents with empty filter', async () => {
      mockSend.mockResolvedValue(mockResponse(10));

      const result = await docProxy.deleteMany<User>('users', {});

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBe(10);
    });
  });

  describe('Connection Lifecycle', () => {
    it('should close database connection', async () => {
      mockSend.mockResolvedValue(mockResponse(undefined));

      await docProxy.close();

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].adapter).toBe('database.document');
      expect(mockSend.mock.calls[0][0].method).toBe('close');
    });
  });

  describe('Error Handling', () => {
    it('should propagate find errors', async () => {
      const error = new Error('Collection not found');
      mockSend.mockResolvedValue(mockErrorResponse(error));

      await expect(docProxy.find<User>('nonexistent', {})).rejects.toThrow('Collection not found');
    });

    it('should propagate insert errors', async () => {
      const error = new Error('Duplicate key error');
      mockSend.mockResolvedValue(mockErrorResponse(error));

      await expect(
        docProxy.insertOne<User>('users', {
          name: 'Alice',
          email: 'alice@example.com',
          age: 25,
        })
      ).rejects.toThrow('Duplicate key error');
    });

    it('should propagate update errors', async () => {
      const error = new Error('Invalid update operation');
      mockSend.mockResolvedValue(mockErrorResponse(error));

      await expect(
        docProxy.updateMany<User>('users', {}, { $invalid: { field: 'value' } } as any)
      ).rejects.toThrow('Invalid update operation');
    });

    it('should propagate delete errors', async () => {
      const error = new Error('Delete failed');
      mockSend.mockResolvedValue(mockErrorResponse(error));

      await expect(docProxy.deleteMany<User>('users', {})).rejects.toThrow('Delete failed');
    });
  });

  describe('Complex Query Operations', () => {
    it('should handle find with sorting and pagination', async () => {
      const mockResult: User[] = [
        {
          id: '2',
          createdAt: 2000,
          updatedAt: 2000,
          name: 'Bob',
          email: 'bob@example.com',
          age: 30,
        },
      ];
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await docProxy.find<User>(
        'users',
        { age: { $gte: 18 } },
        {
          limit: 10,
          skip: 5,
          sort: { age: -1 },
        }
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].args[2]).toEqual({
        limit: 10,
        skip: 5,
        sort: { age: -1 },
      });
      expect(result).toHaveLength(1);
    });

    it('should handle complex filter with multiple operators', async () => {
      const mockResult: User[] = [];
      mockSend.mockResolvedValue(mockResponse(mockResult));

      const result = await docProxy.find<User>('users', {
        age: { $gte: 18, $lte: 65 },
        email: { $exists: true },
        status: { $in: ['active', 'pending'] },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });
  });
});
