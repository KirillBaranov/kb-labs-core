/**
 * @module @kb-labs/core-runtime/__tests__/create-proxy-platform
 * Tests for createProxyPlatform() - creates platform with proxy adapters.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProxyPlatform, closeProxyPlatform } from '../proxy/create-proxy-platform.js';
import type { ITransport } from '../transport/transport.js';
import type { AdapterCall, AdapterResponse } from '@kb-labs/core-platform/serializable';

/**
 * Mock transport for testing without actual Unix socket.
 */
class MockTransport implements ITransport {
  private handlers = new Map<string, (call: AdapterCall) => Promise<AdapterResponse>>();
  connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async send(call: AdapterCall): Promise<AdapterResponse> {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    const handler = this.handlers.get(call.method);
    if (!handler) {
      return {
        success: false,
        error: {
          message: `Method not mocked: ${call.adapter}.${call.method}`,
          code: 'METHOD_NOT_MOCKED',
        },
      };
    }

    return handler(call);
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  /**
   * Mock an adapter method response.
   */
  mockMethod(method: string, handler: (call: AdapterCall) => Promise<AdapterResponse>): void {
    this.handlers.set(method, handler);
  }

  /**
   * Mock successful response.
   */
  mockSuccess(method: string, data: unknown): void {
    this.handlers.set(method, async () => ({
      success: true,
      data,
    }));
  }

  /**
   * Mock error response.
   */
  mockError(method: string, error: string): void {
    this.handlers.set(method, async () => ({
      success: false,
      error: {
        message: error,
        code: 'MOCK_ERROR',
      },
    }));
  }
}

describe('createProxyPlatform', () => {
  let transport: MockTransport;

  beforeEach(() => {
    transport = new MockTransport();
  });

  afterEach(async () => {
    if (transport.connected) {
      await transport.close();
    }
  });

  it('should create platform with proxy adapters', async () => {
    const platform = await createProxyPlatform({ transport });

    expect(platform).toBeDefined();
    expect(platform.cache).toBeDefined();
    expect(platform.llm).toBeDefined();
    expect(platform.embeddings).toBeDefined();
    expect(platform.vectorStore).toBeDefined();
    expect(platform.storage).toBeDefined();
    expect(platform.sqlDatabase).toBeDefined();
    expect(platform.documentDatabase).toBeDefined();
    expect(platform.logger).toBeDefined();
    expect(platform.eventBus).toBeDefined();
    expect(platform.analytics).toBeDefined();
  });

  it('should connect transport during creation', async () => {
    expect(transport.connected).toBe(false);

    await createProxyPlatform({ transport });

    expect(transport.connected).toBe(true);
  });

  it('should forward cache.set() calls via IPC', async () => {
    transport.mockSuccess('set', undefined);

    const platform = await createProxyPlatform({ transport });

    await platform.cache.set('test-key', { foo: 'bar' }, 60000);

    // Verify it was called (no error thrown = success)
    expect(transport.connected).toBe(true);
  });

  it('should forward cache.get() calls via IPC', async () => {
    const mockData = { foo: 'bar', num: 42 };
    transport.mockSuccess('get', mockData);

    const platform = await createProxyPlatform({ transport });

    const result = await platform.cache.get('test-key');

    expect(result).toEqual(mockData);
  });

  it('should forward llm.complete() calls via IPC', async () => {
    const mockResponse = {
      content: 'Hello, world!',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
      model: 'gpt-4',
    };
    transport.mockSuccess('complete', mockResponse);

    const platform = await createProxyPlatform({ transport });

    const result = await platform.llm.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(mockResponse);
  });

  it('should forward embeddings.embed() calls via IPC', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    transport.mockSuccess('embed', mockEmbedding);

    const platform = await createProxyPlatform({ transport });

    const result = await platform.embeddings.embed('test text');

    expect(result).toEqual(mockEmbedding);
  });

  it('should forward vectorStore.search() calls via IPC', async () => {
    const mockResults = [
      { id: 'doc1', score: 0.95, metadata: {} },
      { id: 'doc2', score: 0.85, metadata: {} },
    ];
    transport.mockSuccess('search', mockResults);

    const platform = await createProxyPlatform({ transport });

    const results = await platform.vectorStore.search([0.1, 0.2, 0.3], { limit: 10 });

    expect(results).toEqual(mockResults);
  });

  it('should forward storage.set() calls via IPC', async () => {
    transport.mockSuccess('set', undefined);

    const platform = await createProxyPlatform({ transport });

    await platform.storage.set('bucket', 'key', Buffer.from('data'));

    expect(transport.connected).toBe(true);
  });

  it('should forward storage.get() calls via IPC', async () => {
    const mockData = Buffer.from('test data');
    transport.mockSuccess('get', mockData);

    const platform = await createProxyPlatform({ transport });

    const result = await platform.storage.get('bucket', 'key');

    expect(result).toEqual(mockData);
  });

  it('should forward sqlDatabase.query() calls via IPC', async () => {
    const mockResult = {
      rows: [{ id: 1, name: 'Alice' }],
      rowCount: 1,
    };
    transport.mockSuccess('query', mockResult);

    const platform = await createProxyPlatform({ transport });

    const result = await platform.sqlDatabase.query('SELECT * FROM users');

    expect(result).toEqual(mockResult);
  });

  it('should forward documentDatabase.findOne() calls via IPC', async () => {
    const mockDoc = { _id: '123', name: 'Test' };
    transport.mockSuccess('findOne', mockDoc);

    const platform = await createProxyPlatform({ transport });

    const result = await platform.documentDatabase.findOne('users', { _id: '123' });

    expect(result).toEqual(mockDoc);
  });

  it('should propagate errors from IPC', async () => {
    transport.mockError('get', 'Connection failed');

    const platform = await createProxyPlatform({ transport });

    await expect(platform.cache.get('test-key')).rejects.toThrow('Connection failed');
  });

  it('should use custom logger if provided', async () => {
    const customLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(() => customLogger),
    };

    const platform = await createProxyPlatform({
      transport,
      logger: customLogger,
    });

    platform.logger.info('test message');

    expect(customLogger.info).toHaveBeenCalledWith('test message');
  });

  it('should use noop logger by default', async () => {
    const platform = await createProxyPlatform({ transport });

    // Should not throw
    platform.logger.debug('test');
    platform.logger.info('test');
    platform.logger.warn('test');
    platform.logger.error('test');
    platform.logger.trace('test');

    const child = platform.logger.child();
    expect(child).toBeDefined();
  });

  it('should close transport when closeProxyPlatform() is called', async () => {
    const platform = await createProxyPlatform({ transport });

    expect(transport.connected).toBe(true);

    await closeProxyPlatform(platform);

    expect(transport.connected).toBe(false);
  });

  it('should handle sorted set operations (zadd, zrangebyscore, zrem)', async () => {
    transport.mockSuccess('zadd', undefined);
    transport.mockSuccess('zrangebyscore', ['member1', 'member2']);
    transport.mockSuccess('zrem', undefined);

    const platform = await createProxyPlatform({ transport });

    await platform.cache.zadd('queue', 100, 'job1');
    const members = await platform.cache.zrangebyscore('queue', 0, 200);
    await platform.cache.zrem('queue', 'job1');

    expect(members).toEqual(['member1', 'member2']);
  });

  it('should handle atomic setIfNotExists operation', async () => {
    transport.mockSuccess('setIfNotExists', true);

    const platform = await createProxyPlatform({ transport });

    const result = await platform.cache.setIfNotExists('lock', 'value', 5000);

    expect(result).toBe(true);
  });
});
