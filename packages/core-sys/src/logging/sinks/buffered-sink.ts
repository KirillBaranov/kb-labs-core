/**
 * @module @kb-labs/core-sys/logging/sinks/buffered-sink
 * Buffered sink wrapper for backpressure handling
 * 
 * Оборачивает sink в буфер для защиты от перегрузки.
 * Если буфер переполняется, старые записи отбрасываются (drop oldest).
 */

import type { LogRecord, LogSink } from "../types/types";
import { recordSinkFailure } from "../metrics";

export interface BufferedSinkConfig {
    /** Target sink to wrap */
    sink: LogSink;
    /** Maximum buffer size (default: 10000) */
    maxBufferSize?: number;
    /** Flush interval in milliseconds (default: 1000) */
    flushIntervalMs?: number;
    /** Sink identifier */
    id?: string;
}

/**
 * Buffered sink wrapper with backpressure handling
 * 
 * Использует буфер для асинхронной записи и защиты от перегрузки.
 * Если буфер переполняется, старые записи отбрасываются.
 */
export class BufferedSink implements LogSink {
    private buffer: LogRecord[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private flushing = false;
    private readonly maxBufferSize: number;
    private readonly flushIntervalMs: number;
    private readonly sinkId: string;

    constructor(private config: BufferedSinkConfig) {
        this.maxBufferSize = config.maxBufferSize || 10000;
        this.flushIntervalMs = config.flushIntervalMs || 1000;
        this.sinkId = config.id || config.sink.id || 'buffered-sink';
        
        // Start periodic flush
        this.startFlushTimer();
    }

    handle(rec: LogRecord): void {
        // Если буфер переполнен, отбросить самую старую запись
        if (this.buffer.length >= this.maxBufferSize) {
            this.buffer.shift(); // Drop oldest
        }
        
        this.buffer.push(rec);
        
        // Если буфер большой, попробовать flush немедленно
        if (this.buffer.length >= this.maxBufferSize * 0.8) {
            void this.flush();
        }
    }

    private startFlushTimer(): void {
        if (this.flushTimer) {return;}
        
        this.flushTimer = setInterval(() => {
            void this.flush();
        }, this.flushIntervalMs);
    }

    private stopFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * Flush buffer to target sink
     */
    async flush(): Promise<void> {
        if (this.flushing || this.buffer.length === 0) {
            return;
        }

        this.flushing = true;
        
        try {
            // Copy buffer and clear it immediately
            const records = [...this.buffer];
            this.buffer = [];
            
            // Write all records to target sink
            for (const rec of records) {
                try {
                    await Promise.resolve(this.config.sink.handle(rec));
                } catch (error) {
                    // Record failure but continue with other records
                    const err = error instanceof Error ? error : new Error(String(error));
                    recordSinkFailure(this.sinkId, err);
                }
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            recordSinkFailure(this.sinkId, err);
        } finally {
            this.flushing = false;
        }
    }

    /**
     * Health check
     */
    health(): { ok: boolean; error?: string } {
        const bufferUsage = this.buffer.length / this.maxBufferSize;
        
        if (bufferUsage >= 0.95) {
            return {
                ok: false,
                error: `Buffer nearly full: ${this.buffer.length}/${this.maxBufferSize}`,
            };
        }
        
        return { ok: true };
    }

    /**
     * Graceful shutdown - flush all pending records
     */
    async shutdown(): Promise<void> {
        this.stopFlushTimer();
        await this.flush();
        
        // If target sink has flush method, call it
        if (this.config.sink.flush) {
            await Promise.resolve(this.config.sink.flush());
        }
    }
}

/**
 * Create buffered sink wrapper
 */
export function createBufferedSink(config: BufferedSinkConfig): BufferedSink {
    return new BufferedSink(config);
}

