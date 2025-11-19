import { describe, it, expect, beforeEach } from 'vitest';
import { configureLogger } from '..';
import { configureAI } from '../ai-config';
import { addToContextWindow, getPrecedingEvents, getPrecedingEventsByTime, getEventsByExecution, getEventsByTrace, captureSystemStateSnapshot, getSystemStateSnapshot, enableContextWindow, disableContextWindow, clearContextWindow, getContextWindowStats } from '../context-window';
import type { LogRecord } from '../types';

describe('Context Window', () => {
    beforeEach(() => {
        configureLogger({ 
            sinks: [], 
            level: 'debug', 
            categoryFilter: /.*/, 
            clock: () => new Date('2020-01-01T00:00:00.000Z') 
        });
        configureAI({ mode: 'full' });
        clearContextWindow();
        enableContextWindow();
    });

    describe('Adding Events', () => {
        it('adds log to context window', () => {
            const log: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Test message',
            };
            
            addToContextWindow(log);
            
            const stats = getContextWindowStats();
            expect(stats.entryCount).toBe(1);
        });

        it('respects max entries limit', () => {
            enableContextWindow({ maxEntries: 5 });
            
            for (let i = 0; i < 10; i++) {
                const log: LogRecord = {
                    time: `2020-01-01T00:00:0${i}.000Z`,
                    level: 'info',
                    msg: `Message ${i}`,
                };
                addToContextWindow(log);
            }
            
            const stats = getContextWindowStats();
            expect(stats.entryCount).toBe(5);
        });

        it('does not add when disabled', () => {
            disableContextWindow();
            
            const log: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Test',
            };
            
            addToContextWindow(log);
            
            const stats = getContextWindowStats();
            expect(stats.entryCount).toBe(0);
        });
    });

    describe('Retrieving Events', () => {
        it('gets preceding events by count', () => {
            const logs: LogRecord[] = [];
            const logIds: string[] = [];
            
            for (let i = 0; i < 5; i++) {
                const log: LogRecord = {
                    time: `2020-01-01T00:00:0${i}.000Z`,
                    level: 'info',
                    msg: `Message ${i}`,
                    trace: 'trace-1',
                    span: `span-${i}`,
                };
                logs.push(log);
                addToContextWindow(log);
                logIds.push(`trace-1:span-${i}`);
            }
            
            // Get preceding events for last log
            const preceding = getPrecedingEvents(logIds[4], 3);
            expect(preceding.length).toBeGreaterThan(0);
        });

        it('gets preceding events by time window', () => {
            const baseTime = new Date('2020-01-01T00:00:00.000Z');
            
            for (let i = 0; i < 5; i++) {
                const log: LogRecord = {
                    time: new Date(baseTime.getTime() + i * 1000).toISOString(),
                    level: 'info',
                    msg: `Message ${i}`,
                };
                addToContextWindow(log);
            }
            
            const targetTime = new Date(baseTime.getTime() + 4000).toISOString();
            const preceding = getPrecedingEventsByTime(targetTime, 3000);
            expect(preceding.length).toBeGreaterThan(0);
        });

        it('gets events by execution', () => {
            const execId = 'exec-123';
            
            const log1: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Start',
                executionId: execId,
            };
            
            const log2: LogRecord = {
                time: '2020-01-01T00:00:01.000Z',
                level: 'info',
                msg: 'Continue',
                executionId: execId,
            };
            
            addToContextWindow(log1);
            addToContextWindow(log2);
            
            const events = getEventsByExecution(execId);
            expect(events.length).toBe(2);
        });

        it('gets events by trace', () => {
            const traceId = 'trace-123';
            
            const log1: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Start',
                trace: traceId,
            };
            
            const log2: LogRecord = {
                time: '2020-01-01T00:00:01.000Z',
                level: 'info',
                msg: 'Continue',
                trace: traceId,
            };
            
            addToContextWindow(log1);
            addToContextWindow(log2);
            
            const events = getEventsByTrace(traceId);
            expect(events.length).toBe(2);
        });
    });

    describe('System State Snapshots', () => {
        it('captures system state snapshot', () => {
            captureSystemStateSnapshot({
                metrics: {
                    memory: 1024,
                    cpu: 50,
                },
                contexts: {
                    traceId: 'trace-123',
                },
            });
            
            const stats = getContextWindowStats();
            expect(stats.snapshotCount).toBe(1);
        });

        it('gets closest snapshot to timestamp', () => {
            const baseTime = new Date('2020-01-01T00:00:00.000Z');
            
            captureSystemStateSnapshot({
                metrics: { memory: 1024 },
            });
            
            // Add small delay to ensure different timestamps
            const midTime = new Date(baseTime.getTime() + 1000).toISOString();
            
            captureSystemStateSnapshot({
                metrics: { memory: 2048 },
            });
            
            // Get snapshot closest to midTime (should be first one)
            const snapshot = getSystemStateSnapshot(midTime);
            expect(snapshot).toBeDefined();
            // Should get the closest one (first snapshot at baseTime)
            expect(snapshot?.metrics?.memory).toBe(1024);
        });

        it('respects max snapshots limit', () => {
            enableContextWindow({ maxSnapshots: 3 });
            
            for (let i = 0; i < 5; i++) {
                captureSystemStateSnapshot({
                    metrics: { memory: i * 100 },
                });
            }
            
            const stats = getContextWindowStats();
            expect(stats.snapshotCount).toBe(3);
        });
    });

    describe('Configuration', () => {
        it('enables context window with options', () => {
            enableContextWindow({
                maxEntries: 100,
                maxSnapshots: 20,
            });
            
            const stats = getContextWindowStats();
            expect(stats.enabled).toBe(true);
            expect(stats.maxEntries).toBe(100);
            expect(stats.maxSnapshots).toBe(20);
        });

        it('disables context window', () => {
            enableContextWindow();
            disableContextWindow();
            
            const stats = getContextWindowStats();
            expect(stats.enabled).toBe(false);
        });
    });
});

