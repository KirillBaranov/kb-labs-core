/**
 * @module @kb-labs/core-sys/logging/sinks/file-sink
 * File sink with JSON Lines format and rotation
 */

import type { LogRecord, LogSink } from "../types/types";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { createWriteStream, WriteStream } from "node:fs";

export interface FileSinkConfig {
    path: string; // '.kb/logs/current.jsonl'
    maxSize: string; // '10MB'
    maxAge: string; // '7d'
    compress?: boolean; // gzip старых файлов
}

export class FileSink implements LogSink {
    private stream: WriteStream | null = null;
    private currentSize: number = 0;
    private readonly maxSizeBytes: number;
    private initPromise: Promise<void> | null = null;
    private flushPromise: Promise<void> | null = null;

    constructor(private config: FileSinkConfig) {
        this.maxSizeBytes = this.parseSize(config.maxSize);
    }

    async init(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            // Создать директорию если не существует
            const dir = path.dirname(this.config.path);
            await fs.mkdir(dir, { recursive: true });

            // Открыть stream
            this.stream = createWriteStream(this.config.path, { flags: "a" });

            // Получить текущий размер файла
            try {
                const stats = await fs.stat(this.config.path);
                this.currentSize = stats.size;
            } catch {
                this.currentSize = 0;
            }
        })();

        return this.initPromise;
    }

    handle(rec: LogRecord): void {
        // Инициализация отложенная
        if (!this.stream) {
            void this.init().then(() => this.write(rec)).catch(console.error);
            return;
        }

        this.write(rec);
    }

    private write(rec: LogRecord): void {
        if (!this.stream) return;

        const line = JSON.stringify(rec) + "\n";
        const size = Buffer.byteLength(line, "utf8");

        // Проверка на ротацию
        if (this.currentSize + size > this.maxSizeBytes) {
            void this.rotate();
        }

        // Запись
        this.stream.write(line);
        this.currentSize += size;
    }

    private async rotate(): Promise<void> {
        // Закрыть текущий stream
        if (this.stream) {
            await new Promise<void>((resolve) => {
                this.stream!.end(() => resolve());
            });
            this.stream = null;
        }

        // Переименовать current → архив
        const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const dir = path.dirname(this.config.path);
        const archivePath = path.join(dir, `kb-${timestamp}.jsonl`);

        try {
            await fs.rename(this.config.path, archivePath);
            const { recordRotation } = await import("../metrics");
            recordRotation();
        } catch (err) {
            console.error("Failed to rotate log file:", err);
        }

        // Создать новый stream
        this.initPromise = null;
        await this.init();
    }

    /**
     * Flush pending writes
     */
    async flush(): Promise<void> {
        if (this.flushPromise) {
            return this.flushPromise;
        }

        this.flushPromise = (async () => {
            if (!this.stream) {
                return;
            }

            // Wait for stream to drain
            await new Promise<void>((resolve, reject) => {
                if (!this.stream) {
                    resolve();
                    return;
                }

                if (this.stream.writableEnded) {
                    resolve();
                    return;
                }

                this.stream.once('drain', resolve);
                this.stream.once('error', reject);
                
                // If stream is not draining, resolve anyway after short timeout
                setTimeout(() => {
                    resolve();
                }, 100);
            });
        })();

        try {
            await this.flushPromise;
        } finally {
            this.flushPromise = null;
        }
    }

    private parseSize(size: string): number {
        const units: Record<string, number> = {
            B: 1,
            KB: 1024,
            MB: 1024 * 1024,
            GB: 1024 * 1024 * 1024,
        };

        const match = size.match(/^(\d+)(B|KB|MB|GB)$/i);
        if (!match) {
            throw new Error(`Invalid size format: ${size}`);
        }

        const [, value, unit] = match;
        return parseInt(value!, 10) * units[unit!.toUpperCase()]!;
    }

    async close(): Promise<void> {
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }
    }
}

export function createFileSink(config: FileSinkConfig): FileSink {
    return new FileSink(config);
}


