import { describe, it, expect, beforeEach } from 'vitest';
import { configureLogger } from '..';
import { configureAI } from '../ai-config';
import { trackCausality, getLogRelationships, getLogGroup, clearCausalityState, configureCausalityTracking } from '../causality-tracker';
import type { LogRecord } from '../types';

describe('Causality Tracker', () => {
    beforeEach(() => {
        configureLogger({ 
            sinks: [], 
            level: 'debug', 
            categoryFilter: /.*/, 
            clock: () => new Date('2020-01-01T00:00:00.000Z') 
        });
        configureAI({ mode: 'full' });
        clearCausalityState();
    });

    describe('Relationship Detection', () => {
        it('detects execution context relationships', () => {
            const execId = 'exec-123';
            
            const log1: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Started',
                executionId: execId,
                trace: 'trace-1',
                span: 'span-1',
            };
            
            const log2: LogRecord = {
                time: '2020-01-01T00:00:01.000Z',
                level: 'info',
                msg: 'Processing',
                executionId: execId,
                trace: 'trace-1',
                span: 'span-2',
                parentSpan: 'span-1',
            };
            
            trackCausality(log1);
            const result = trackCausality(log2);
            
            expect(result.relationships).toBeDefined();
            expect(result.relationships?.parents).toBeDefined();
            expect(result.relationships?.parents?.length).toBeGreaterThan(0);
        });

        it('detects trace/span relationships', () => {
            const traceId = 'trace-123';
            
            const parentLog: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Parent',
                trace: traceId,
                span: 'span-parent',
            };
            
            const childLog: LogRecord = {
                time: '2020-01-01T00:00:01.000Z',
                level: 'info',
                msg: 'Child',
                trace: traceId,
                span: 'span-child',
                parentSpan: 'span-parent',
            };
            
            trackCausality(parentLog);
            const result = trackCausality(childLog);
            
            expect(result.relationships?.parents).toBeDefined();
            const parentRel = result.relationships?.parents?.find(
                r => r.relationship === 'caused-by'
            );
            expect(parentRel).toBeDefined();
        });

        it('detects semantic relationships', () => {
            configureAI({ mode: 'basic' });
            
            const actionLog: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'User created project',
                category: 'plugin:test',
                semantics: {
                    intent: 'action',
                    operation: 'create',
                    outcome: 'success',
                    domain: 'test',
                },
            };
            
            const errorLog: LogRecord = {
                time: '2020-01-01T00:00:02.000Z',
                level: 'error',
                msg: 'Failed to save',
                category: 'plugin:test',
                semantics: {
                    intent: 'error',
                    outcome: 'failure',
                    domain: 'test',
                },
            };
            
            trackCausality(actionLog);
            const result = trackCausality(errorLog);
            
            // Error after action in same domain should be related
            expect(result.relationships?.parents).toBeDefined();
        });
    });

    describe('Log Groups', () => {
        it('creates group for execution', () => {
            const execId = 'exec-123';
            
            const log1: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Started',
                executionId: execId,
            };
            
            const log2: LogRecord = {
                time: '2020-01-01T00:00:01.000Z',
                level: 'info',
                msg: 'Processing',
                executionId: execId,
            };
            
            const result1 = trackCausality(log1);
            const result2 = trackCausality(log2);
            
            expect(result1.group).toBeDefined();
            expect(result2.group).toBeDefined();
            expect(result1.group?.groupId).toBe(result2.group?.groupId);
            expect(result1.group?.groupType).toBe('workflow');
        });

        it('creates group for trace', () => {
            const traceId = 'trace-123';
            
            const log1: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Start',
                trace: traceId,
                span: 'span-1',
            };
            
            const log2: LogRecord = {
                time: '2020-01-01T00:00:01.000Z',
                level: 'info',
                msg: 'Continue',
                trace: traceId,
                span: 'span-2',
            };
            
            trackCausality(log1);
            const result = trackCausality(log2);
            
            expect(result.group).toBeDefined();
            expect(result.group?.groupType).toBe('transaction');
        });

        it('updates group end time on success', () => {
            const execId = 'exec-123';
            
            const log1: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Started',
                executionId: execId,
            };
            
            const log2: LogRecord = {
                time: '2020-01-01T00:00:01.000Z',
                level: 'info',
                msg: 'Completed',
                executionId: execId,
                semantics: {
                    intent: 'action',
                    outcome: 'success',
                },
            };
            
            trackCausality(log1);
            const result = trackCausality(log2);
            
            expect(result.group?.endTime).toBe('2020-01-01T00:00:01.000Z');
        });
    });

    describe('API Functions', () => {
        it('gets log relationships', () => {
            const execId = 'exec-123';
            
            const log1: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Start',
                executionId: execId,
                trace: 'trace-1',
                span: 'span-1',
            };
            
            const log2: LogRecord = {
                time: '2020-01-01T00:00:01.000Z',
                level: 'info',
                msg: 'Continue',
                executionId: execId,
                trace: 'trace-1',
                span: 'span-2',
            };
            
            trackCausality(log1);
            trackCausality(log2);
            
            // Get relationships for log2 (should have relationship to log1)
            const relationships = getLogRelationships('trace-1:span-2');
            expect(relationships.length).toBeGreaterThan(0);
        });

        it('gets log group', () => {
            const execId = 'exec-123';
            
            const log: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Start',
                executionId: execId,
            };
            
            const result = trackCausality(log);
            const groupId = result.group?.groupId;
            
            expect(groupId).toBeDefined();
            
            const group = getLogGroup(groupId!);
            expect(group).toBeDefined();
            expect(group?.groupId).toBe(groupId);
        });

        it('configures causality tracking', () => {
            configureCausalityTracking({ maxRecentLogs: 50 });
            
            // Should not throw
            expect(true).toBe(true);
        });
    });
});

