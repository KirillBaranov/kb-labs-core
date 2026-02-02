/**
 * @module @kb-labs/core-sys/logging/shutdown
 * Graceful shutdown for logging system
 * 
 * Обеспечивает правильное завершение работы всех sinks:
 * - Flush всех буферов
 * - Закрытие файловых потоков
 * - Отправка последних записей в удаленные системы
 */

import { getGlobalState } from "./state";

let shutdownHandlers: Array<() => Promise<void> | void> = [];
let isShuttingDown = false;

/**
 * Register shutdown handler
 * 
 * Обработчики вызываются в порядке регистрации при graceful shutdown.
 */
export function registerShutdownHandler(handler: () => Promise<void> | void): void {
    shutdownHandlers.push(handler);
}

/**
 * Remove shutdown handler
 */
export function unregisterShutdownHandler(handler: () => Promise<void> | void): void {
    shutdownHandlers = shutdownHandlers.filter(h => h !== handler);
}

/**
 * Graceful shutdown of all sinks
 * 
 * Вызывает flush() для всех sinks и ждет завершения.
 * Можно вызвать вручную или автоматически при SIGTERM/SIGINT.
 * 
 * @param timeoutMs - Maximum time to wait for shutdown (default: 5000ms)
 */
export async function shutdownLogging(timeoutMs = 5000): Promise<void> {
    if (isShuttingDown) {
        return; // Already shutting down
    }
    
    isShuttingDown = true;
    
    try {
        const state = getGlobalState();
        
        // Flush all sinks
        const flushPromises: Promise<void>[] = [];
        
        for (const sink of state.sinks) {
            if (sink.flush) {
                flushPromises.push(
                    Promise.resolve(sink.flush()).catch((error) => {
                        // Log error but don't throw
                        if (typeof console !== 'undefined' && console.error) {
                            console.error(`[logging] Sink flush failed:`, error);
                        }
                    })
                );
            }
        }
        
        // Call registered shutdown handlers
        for (const handler of shutdownHandlers) {
            flushPromises.push(
                Promise.resolve(handler()).catch((error) => {
                    if (typeof console !== 'undefined' && console.error) {
                        console.error(`[logging] Shutdown handler failed:`, error);
                    }
                })
            );
        }
        
        // Wait for all flushes with timeout
        await Promise.race([
            Promise.all(flushPromises),
            new Promise<void>((resolve) => {
                setTimeout(() => {
                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn(`[logging] Shutdown timeout after ${timeoutMs}ms`);
                    }
                    resolve();
                }, timeoutMs);
            }),
        ]);
    } catch (error) {
        // Log but don't throw - shutdown should always complete
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[logging] Shutdown error:`, error);
        }
    } finally {
        isShuttingDown = false;
    }
}

/**
 * Setup automatic graceful shutdown on process signals
 * 
 * Регистрирует обработчики SIGTERM и SIGINT для автоматического graceful shutdown.
 * Вызывается автоматически при инициализации логирования.
 */
export function setupGracefulShutdown(): void {
    if (typeof process === 'undefined') {
        return; // Not in Node.js environment
    }
    
    const shutdown = () => {
        void shutdownLogging().then(() => {
            process.exit(0);
        });
    };
    
    // Register signal handlers
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    
    // Also handle uncaught exceptions and unhandled rejections
    process.once('uncaughtException', (error) => {
        // Try to log the error before shutdown
        if (typeof console !== 'undefined' && console.error) {
            console.error('[logging] Uncaught exception:', error);
        }
        void shutdownLogging().then(() => {
            process.exit(1);
        });
    });
    
    process.once('unhandledRejection', (reason) => {
        if (typeof console !== 'undefined' && console.error) {
            console.error('[logging] Unhandled rejection:', reason);
        }
        void shutdownLogging().then(() => {
            process.exit(1);
        });
    });
}

