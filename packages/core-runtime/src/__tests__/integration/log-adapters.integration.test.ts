/**
 * @module @kb-labs/core-runtime/__tests__/integration/log-adapters
 * Integration tests for complete log adapter system.
 *
 * Tests the full flow: Logger + RingBuffer + Persistence extensions
 */

import { describe, it, expect, vi } from 'vitest';
import { AdapterLoader } from '../../adapter-loader.js';
import type { AdapterManifest, LogRecord } from '@kb-labs/core-platform';
import type { AdapterConfig } from '../../adapter-loader.js';

describe('Log Adapters Integration', () => {
  /**
   * Test complete log flow: logger → ring buffer → persistence
   */
  it('should connect logger with ring buffer and persistence extensions', async () => {
    const loader = new AdapterLoader();

    // Track execution order
    const executionLog: string[] = [];

    // Mock logger with onLog hook
    const mockLogger = {
      info: vi.fn((message: string) => {
        executionLog.push(`logger.info: ${message}`);
      }),
      onLog: vi.fn((callback: (record: LogRecord) => void) => {
        executionLog.push('logger.onLog registered');
        // Store callback for later invocation
        mockLogger._callbacks.push(callback);
        return () => {
          const index = mockLogger._callbacks.indexOf(callback);
          if (index !== -1) {mockLogger._callbacks.splice(index, 1);}
        };
      }),
      _callbacks: [] as Array<(record: LogRecord) => void>,
      _emit: (record: LogRecord) => {
        for (const callback of mockLogger._callbacks) {
          callback(record);
        }
      },
    };

    // Mock ring buffer
    const mockRingBuffer = {
      append: vi.fn((record: LogRecord) => {
        executionLog.push(`ringBuffer.append: ${record.message}`);
      }),
      getRecords: vi.fn(() => []),
    };

    // Mock persistence
    const mockPersistence = {
      write: vi.fn(async (record: LogRecord) => {
        executionLog.push(`persistence.write: ${record.message}`);
      }),
    };

    // Adapter configs
    const configs: Record<string, AdapterConfig> = {
      logger: { module: '@kb-labs/adapters-pino', config: {} },
      logRingBuffer: { module: '@kb-labs/adapters-log-ring-buffer', config: {} },
      logPersistence: { module: '@kb-labs/adapters-log-sqlite', config: {} },
    };

    // Mock module loader
    const loadModule = vi.fn(async (modulePath: string) => {
      if (modulePath === '@kb-labs/adapters-pino') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'pino-logger',
            name: 'Pino Logger',
            version: '1.0.0',
            type: 'core',
            implements: 'ILogger',
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockLogger),
        };
      }

      if (modulePath === '@kb-labs/adapters-log-ring-buffer') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'log-ring-buffer',
            name: 'Log Ring Buffer',
            version: '1.0.0',
            type: 'extension',
            implements: 'ILogRingBuffer',
            extends: {
              adapter: 'logger',
              hook: 'onLog',
              method: 'append',
              priority: 10, // Higher priority - called first
            },
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockRingBuffer),
        };
      }

      if (modulePath === '@kb-labs/adapters-log-sqlite') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'log-persistence',
            name: 'Log Persistence',
            version: '1.0.0',
            type: 'extension',
            implements: 'ILogPersistence',
            extends: {
              adapter: 'logger',
              hook: 'onLog',
              method: 'write',
              priority: 5, // Lower priority - called second
            },
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockPersistence),
        };
      }

      throw new Error(`Unknown module: ${modulePath}`);
    });

    // Load adapters
    const adapters = await loader.loadAdapters(configs, loadModule);

    // Build graph for extension connection
    const graph = await loader.buildDependencyGraph(configs, loadModule);

    // Connect extensions
    loader.connectExtensions(adapters, graph);

    // Verify adapters loaded
    expect(adapters.get('logger')).toBe(mockLogger);
    expect(adapters.get('logRingBuffer')).toBe(mockRingBuffer);
    expect(adapters.get('logPersistence')).toBe(mockPersistence);

    // Verify extensions registered (onLog called twice - once per extension)
    expect(mockLogger.onLog).toHaveBeenCalledTimes(2);

    // Simulate logging event
    const logRecord: LogRecord = {
      timestamp: Date.now(),
      level: 'info',
      message: 'Test log message',
      fields: {},
      source: 'test',
    };

    // Emit log event (simulating what logger would do internally)
    mockLogger._emit(logRecord);

    // Verify both extensions called in priority order
    expect(mockRingBuffer.append).toHaveBeenCalledWith(logRecord);
    expect(mockPersistence.write).toHaveBeenCalledWith(logRecord);

    // Verify execution order
    expect(executionLog).toEqual([
      'logger.onLog registered',
      'logger.onLog registered',
      'ringBuffer.append: Test log message',
      'persistence.write: Test log message',
    ]);
  });

  /**
   * Test that extensions are called in priority order
   */
  it('should call extensions in priority order (higher first)', async () => {
    const loader = new AdapterLoader();
    const callOrder: string[] = [];

    const mockLogger = {
      onLog: vi.fn((callback: (record: LogRecord) => void) => {
        mockLogger._callbacks.push(callback);
        return () => {};
      }),
      _callbacks: [] as Array<(record: LogRecord) => void>,
      _emit: (record: LogRecord) => {
        for (const callback of mockLogger._callbacks) {
          callback(record);
        }
      },
    };

    const ext1 = {
      method: vi.fn(() => callOrder.push('ext1 (priority 100)')),
    };

    const ext2 = {
      method: vi.fn(() => callOrder.push('ext2 (priority 50)')),
    };

    const ext3 = {
      method: vi.fn(() => callOrder.push('ext3 (priority 10)')),
    };

    const configs: Record<string, AdapterConfig> = {
      logger: { module: '@kb-labs/logger', config: {} },
      ext1: { module: '@kb-labs/ext1', config: {} },
      ext2: { module: '@kb-labs/ext2', config: {} },
      ext3: { module: '@kb-labs/ext3', config: {} },
    };

    const loadModule = vi.fn(async (modulePath: string) => {
      if (modulePath === '@kb-labs/logger') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'logger',
            name: 'Logger',
            version: '1.0.0',
            type: 'core',
            implements: 'ILogger',
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockLogger),
        };
      }

      if (modulePath === '@kb-labs/ext1') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'ext1',
            name: 'Extension 1',
            version: '1.0.0',
            type: 'extension',
            implements: 'IExt',
            extends: { adapter: 'logger', hook: 'onLog', method: 'method', priority: 100 },
          } as AdapterManifest,
          createAdapter: vi.fn(() => ext1),
        };
      }

      if (modulePath === '@kb-labs/ext2') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'ext2',
            name: 'Extension 2',
            version: '1.0.0',
            type: 'extension',
            implements: 'IExt',
            extends: { adapter: 'logger', hook: 'onLog', method: 'method', priority: 50 },
          } as AdapterManifest,
          createAdapter: vi.fn(() => ext2),
        };
      }

      if (modulePath === '@kb-labs/ext3') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'ext3',
            name: 'Extension 3',
            version: '1.0.0',
            type: 'extension',
            implements: 'IExt',
            extends: { adapter: 'logger', hook: 'onLog', method: 'method', priority: 10 },
          } as AdapterManifest,
          createAdapter: vi.fn(() => ext3),
        };
      }

      throw new Error(`Unknown module: ${modulePath}`);
    });

    const adapters = await loader.loadAdapters(configs, loadModule);
    const graph = await loader.buildDependencyGraph(configs, loadModule);
    loader.connectExtensions(adapters, graph);

    // Emit log event
    const logRecord: LogRecord = {
      timestamp: Date.now(),
      level: 'info',
      message: 'Test',
      fields: {},
      source: 'test',
    };

    mockLogger._emit(logRecord);

    // Verify call order: ext1 (100) → ext2 (50) → ext3 (10)
    expect(callOrder).toEqual([
      'ext1 (priority 100)',
      'ext2 (priority 50)',
      'ext3 (priority 10)',
    ]);
  });

  /**
   * Test that missing optional extension doesn't break system
   */
  it('should work with missing optional extensions', async () => {
    const loader = new AdapterLoader();

    const mockLogger = {
      info: vi.fn(),
      onLog: vi.fn(() => () => {}),
    };

    const configs: Record<string, AdapterConfig> = {
      logger: { module: '@kb-labs/adapters-pino', config: {} },
      // logRingBuffer is missing (but it's optional)
    };

    const loadModule = vi.fn(async (modulePath: string) => {
      if (modulePath === '@kb-labs/adapters-pino') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'pino-logger',
            name: 'Pino Logger',
            version: '1.0.0',
            type: 'core',
            implements: 'ILogger',
            optional: {
              adapters: ['logRingBuffer'], // Optional extension
            },
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockLogger),
        };
      }

      throw new Error(`Unknown module: ${modulePath}`);
    });

    // Should not throw
    const adapters = await loader.loadAdapters(configs, loadModule);
    expect(adapters.get('logger')).toBe(mockLogger);
  });

  /**
   * Test error handling when extension method is missing
   */
  it('should warn when extension method is missing', async () => {
    const loader = new AdapterLoader();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockLogger = {
      onLog: vi.fn(() => () => {}),
    };

    // Extension without required method
    const mockExtension = {
      // Missing 'append' method
    };

    const configs: Record<string, AdapterConfig> = {
      logger: { module: '@kb-labs/logger', config: {} },
      ext: { module: '@kb-labs/ext', config: {} },
    };

    const loadModule = vi.fn(async (modulePath: string) => {
      if (modulePath === '@kb-labs/logger') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'logger',
            name: 'Logger',
            version: '1.0.0',
            type: 'core',
            implements: 'ILogger',
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockLogger),
        };
      }

      if (modulePath === '@kb-labs/ext') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'ext',
            name: 'Extension',
            version: '1.0.0',
            type: 'extension',
            implements: 'IExt',
            extends: { adapter: 'logger', hook: 'onLog', method: 'append' },
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockExtension),
        };
      }

      throw new Error(`Unknown module: ${modulePath}`);
    });

    const adapters = await loader.loadAdapters(configs, loadModule);
    const graph = await loader.buildDependencyGraph(configs, loadModule);

    // Should not throw, but should warn
    loader.connectExtensions(adapters, graph);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('extension has no method "append"')
    );

    consoleWarnSpy.mockRestore();
  });

  /**
   * Test unsubscribe functionality
   */
  it('should support unsubscribing extensions', async () => {
    const loader = new AdapterLoader();

    const unsubscribeFns: Array<() => void> = [];

    const mockLogger = {
      onLog: vi.fn((callback: (record: LogRecord) => void) => {
        mockLogger._callbacks.push(callback);
        const unsubscribe = () => {
          const index = mockLogger._callbacks.indexOf(callback);
          if (index !== -1) {mockLogger._callbacks.splice(index, 1);}
        };
        unsubscribeFns.push(unsubscribe);
        return unsubscribe;
      }),
      _callbacks: [] as Array<(record: LogRecord) => void>,
      _emit: (record: LogRecord) => {
        for (const callback of mockLogger._callbacks) {
          callback(record);
        }
      },
    };

    const mockExtension = {
      append: vi.fn(),
    };

    const configs: Record<string, AdapterConfig> = {
      logger: { module: '@kb-labs/logger', config: {} },
      ext: { module: '@kb-labs/ext', config: {} },
    };

    const loadModule = vi.fn(async (modulePath: string) => {
      if (modulePath === '@kb-labs/logger') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'logger',
            name: 'Logger',
            version: '1.0.0',
            type: 'core',
            implements: 'ILogger',
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockLogger),
        };
      }

      if (modulePath === '@kb-labs/ext') {
        return {
          manifest: {
            manifestVersion: '1.0.0',
            id: 'ext',
            name: 'Extension',
            version: '1.0.0',
            type: 'extension',
            implements: 'IExt',
            extends: { adapter: 'logger', hook: 'onLog', method: 'append' },
          } as AdapterManifest,
          createAdapter: vi.fn(() => mockExtension),
        };
      }

      throw new Error(`Unknown module: ${modulePath}`);
    });

    const adapters = await loader.loadAdapters(configs, loadModule);
    const graph = await loader.buildDependencyGraph(configs, loadModule);
    loader.connectExtensions(adapters, graph);

    // Emit log event
    const logRecord: LogRecord = {
      timestamp: Date.now(),
      level: 'info',
      message: 'Test',
      fields: {},
      source: 'test',
    };

    mockLogger._emit(logRecord);
    expect(mockExtension.append).toHaveBeenCalledTimes(1);

    // Unsubscribe
    unsubscribeFns[0]();

    // Emit again
    mockLogger._emit(logRecord);

    // Should not be called again
    expect(mockExtension.append).toHaveBeenCalledTimes(1);
  });
});
