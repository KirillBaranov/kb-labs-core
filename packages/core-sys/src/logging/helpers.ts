/**
 * @module @kb-labs/core-sys/logging/helpers
 * Helper functions for plugin developers
 * 
 * Упрощают использование логирования для разработчиков плагинов,
 * автоматически добавляя базовую семантику и контекст.
 */

import { getLogger } from './logger';
import type { Logger } from './types';

/**
 * Log an action with automatic semantic inference
 * 
 * @example
 * ```typescript
 * const logger = getLogger('my-plugin');
 * logAction(logger, 'User created project', { userId: '123', projectId: '456' });
 * ```
 */
export function logAction(
    logger: Logger,
    action: string,
    details: Record<string, unknown> & { outcome?: 'success' | 'failure' }
): void {
    const { outcome = 'success', ...rest } = details;
    
    logger.info(action, {
        ...rest,
        semantics: {
            intent: 'action',
            outcome,
        },
    });
}

/**
 * Log an error with automatic context
 * 
 * @example
 * ```typescript
 * const logger = getLogger('my-plugin');
 * try {
 *   // ...
 * } catch (error) {
 *   logError(logger, error, { userId: '123' });
 * }
 * ```
 */
export function logError(
    logger: Logger,
    error: Error,
    context?: Record<string, unknown>
): void {
    logger.error(error.message, {
        ...context,
        err: error,
        semantics: {
            intent: 'error',
            outcome: 'failure',
        },
    });
}

/**
 * Create a logger for a plugin with automatic context
 * 
 * Automatically adds plugin ID and version to all logs.
 * 
 * @example
 * ```typescript
 * const logger = createPluginLogger('my-plugin', '1.0.0');
 * logger.info('Task completed', { taskId: '123' });
 * // Automatically includes: plugin: 'my-plugin', pluginVersion: '1.0.0'
 * ```
 */
export function createPluginLogger(pluginId: string, pluginVersion: string): {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown> | Error) => void;
    child: (bindings: { category?: string; meta?: Record<string, unknown> }) => Logger;
} {
    const logger = getLogger(`plugin:${pluginId}`);
    
    const createLogMethod = (method: 'debug' | 'info' | 'warn' | 'error') => {
        return (msg: string, meta?: Record<string, unknown> | Error) => {
            if (meta instanceof Error) {
                logger[method](msg, {
                    plugin: pluginId,
                    pluginVersion,
                    err: meta,
                });
            } else {
                logger[method](msg, {
                    ...meta,
                    plugin: pluginId,
                    pluginVersion,
                });
            }
        };
    };
    
    return {
        debug: createLogMethod('debug'),
        info: createLogMethod('info'),
        warn: createLogMethod('warn'),
        error: createLogMethod('error'),
        child: (bindings) => logger.child({
            ...bindings,
            meta: {
                ...bindings.meta,
                plugin: pluginId,
                pluginVersion,
            },
        }),
    };
}

