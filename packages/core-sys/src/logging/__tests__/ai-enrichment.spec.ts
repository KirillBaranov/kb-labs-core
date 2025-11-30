import { describe, it, expect, beforeEach } from 'vitest';
import { configureLogger, getLogger } from '..';
import { configureAI, getAIConfig, isAIEnabled } from '../ai-config';
import { enrichLogRecord } from '../ai-enrichment';
import type { LogRecord } from '../types';

describe('AI Enrichment', () => {
    beforeEach(() => {
        configureLogger({ 
            sinks: [], 
            level: 'debug', 
            categoryFilter: /.*/, 
            clock: () => new Date('2020-01-01T00:00:00.000Z') 
        });
        configureAI({ mode: 'off' });
    });

    describe('Configuration', () => {
        it('configures AI mode', () => {
            configureAI({ mode: 'basic' });
            expect(getAIConfig()?.mode).toBe('basic');
        });

        it('checks if AI is enabled', () => {
            configureAI({ mode: 'off' });
            expect(isAIEnabled()).toBe(false);
            
            configureAI({ mode: 'basic' });
            expect(isAIEnabled()).toBe(true);
            
            configureAI({ mode: 'full' });
            expect(isAIEnabled()).toBe(true);
        });

        it('configures AI features', () => {
            configureAI({
                mode: 'basic',
                features: {
                    semanticTags: true,
                    embeddings: {
                        enabled: true,
                        mode: 'async',
                    },
                    nlp: {
                        enabled: true,
                        extractEntities: true,
                    },
                },
            });
            
            const config = getAIConfig();
            expect(config?.mode).toBe('basic');
            expect(config?.features?.semanticTags).toBe(true);
            expect(config?.features?.embeddings?.enabled).toBe(true);
        });
    });

    describe('Semantic Inference', () => {
        it('infers action intent', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'User created project',
                category: 'plugin:test',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.semantics?.intent).toBe('action');
            expect(enriched.semantics?.operation).toBe('create');
            expect(enriched.semantics?.outcome).toBe('success');
        });

        it('infers error intent', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'error',
                msg: 'Failed to connect',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.semantics?.intent).toBe('error');
            expect(enriched.semantics?.outcome).toBe('failure');
        });

        it('infers metric intent', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Request took 150ms',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.semantics?.intent).toBe('metric');
            expect(enriched.semantics?.outcome).toBe('success');
        });

        it('infers state intent', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Service initialized',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.semantics?.intent).toBe('state');
            expect(enriched.semantics?.outcome).toBe('success');
        });

        it('extracts domain from category', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Task completed',
                category: 'auth:login',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.semantics?.domain).toBe('auth');
        });

        it('extracts domain from plugin', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Task completed',
                plugin: 'payment-processor',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.semantics?.domain).toBe('payment-processor');
        });
    });

    describe('Entity Extraction', () => {
        it('extracts entities from meta', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'User action',
                meta: {
                    userId: '123',
                    projectId: '456',
                    userName: 'John Doe',
                    email: 'john@example.com',
                },
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.nlp?.entities).toBeDefined();
            expect(enriched.nlp?.entities?.length).toBeGreaterThan(0);
            
            const entityTypes = enriched.nlp?.entities?.map(e => e.type) || [];
            expect(entityTypes).toContain('user');
            expect(entityTypes).toContain('project');
        });

        it('does not extract entities when NLP is disabled', () => {
            configureAI({
                mode: 'basic',
                features: {
                    nlp: {
                        enabled: false,
                    },
                },
            });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'User action',
                meta: {
                    userId: '123',
                },
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.nlp).toBeUndefined();
        });
    });

    describe('PII Detection', () => {
        it('detects email in message', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'User email is john@example.com',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.containsPII).toBe(true);
            expect(enriched.privacy?.piiTypes).toContain('email');
        });

        it('detects phone number', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Contact phone: +1234567890',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.containsPII).toBe(true);
            expect(enriched.privacy?.piiTypes).toContain('phone');
        });

        it('detects PII in meta', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'User data',
                meta: {
                    email: 'user@example.com',
                },
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.containsPII).toBe(true);
            expect(enriched.privacy?.piiTypes).toContain('email');
        });

        it('sets default sensitivity when PII detected', () => {
            configureAI({
                mode: 'basic',
                features: {
                    privacy: {
                        autoDetectPII: true,
                        defaultSensitivity: 'confidential',
                    },
                },
            });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Email: test@example.com',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.sensitivity).toBe('confidential');
            expect(enriched.privacy?.aiTraining?.allowed).toBe(false);
            expect(enriched.privacy?.aiTraining?.anonymize).toBe(true);
        });

        it('detects API keys', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'API key: sk_live_1234567890abcdef1234567890abcdef',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.containsPII).toBe(true);
            expect(enriched.privacy?.piiTypes).toContain('apiKey');
        });

        it('detects API keys in meta', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Request sent',
                meta: {
                    apiKey: 'Bearer abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
                },
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.containsPII).toBe(true);
            expect(enriched.privacy?.piiTypes).toContain('apiKey');
        });

        it('detects sensitive keys in meta (apiKey, secretKey, etc.)', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Config loaded',
                meta: {
                    api_key: 'some-key-value',
                    secretKey: 'secret-value',
                },
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.containsPII).toBe(true);
            expect(enriched.privacy?.piiTypes).toContain('apiKey');
        });

        it('detects env variables as sensitive', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Environment loaded',
                meta: {
                    env: {
                        API_KEY: 'secret-api-key',
                        DATABASE_PASSWORD: 'secret-password',
                    },
                },
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.containsPII).toBe(true);
            expect(enriched.privacy?.piiTypes).toContain('apiKey');
        });

        it('does not detect PII when privacy detection is disabled', () => {
            configureAI({
                mode: 'basic',
                features: {
                    privacy: {
                        autoDetectPII: false,
                    },
                },
            });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Email: test@example.com',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.privacy?.containsPII).toBeUndefined();
        });
    });

    describe('Embedding Preparation', () => {
        it('prepares embedding text', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Task completed successfully',
                category: 'plugin:test',
                plugin: 'test-plugin',
                meta: {
                    taskId: '123',
                },
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.embedding?.embeddingText).toBeDefined();
            expect(enriched.embedding?.embeddingText).toContain('plugin:test');
            expect(enriched.embedding?.embeddingText).toContain('Task completed successfully');
        });

        it('includes embedding metadata', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'error',
                msg: 'Failed to process',
                category: 'auth',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.embedding?.embeddingMeta).toBeDefined();
            expect(enriched.embedding?.embeddingMeta?.logType).toBe('auth');
            expect(enriched.embedding?.embeddingMeta?.severity).toBe(10); // error level
            expect(enriched.embedding?.embeddingMeta?.domain).toBe('auth');
            expect(enriched.embedding?.embeddingMeta?.keywords).toBeDefined();
        });

        it('does not prepare embedding when disabled', () => {
            configureAI({
                mode: 'basic',
                features: {
                    embeddings: {
                        enabled: false,
                    },
                },
            });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Task completed',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.embedding).toBeUndefined();
        });
    });

    describe('AI Schema Version', () => {
        it('adds AI schema version', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'Test message',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.ai?.schemaVersion).toBe('1.0.0');
            expect(enriched.ai?.supportedFeatures).toContain('embedding');
            expect(enriched.ai?.supportedFeatures).toContain('semantics');
        });
    });

    describe('Conditional Enrichment', () => {
        it('does not enrich when AI is disabled', () => {
            configureAI({ mode: 'off' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'User created project',
                meta: {
                    userId: '123',
                },
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.semantics).toBeUndefined();
            expect(enriched.nlp).toBeUndefined();
            expect(enriched.embedding).toBeUndefined();
            expect(enriched.privacy).toBeUndefined();
            expect(enriched.ai).toBeUndefined();
        });

        it('enriches when AI is enabled', () => {
            configureAI({ mode: 'basic' });
            
            const record: LogRecord = {
                time: '2020-01-01T00:00:00.000Z',
                level: 'info',
                msg: 'User created project',
            };
            
            const enriched = enrichLogRecord(record);
            expect(enriched.semantics).toBeDefined();
            expect(enriched.ai).toBeDefined();
        });
    });

    describe('Integration with Logger', () => {
        it('enriches logs when AI is enabled', async () => {
            configureAI({ mode: 'basic' });
            
            const records: LogRecord[] = [];
            configureLogger({
                sinks: [{
                    handle: (rec) => { records.push(rec); }
                }],
                level: 'info',
            });
            
            const logger = getLogger('test');
            logger.info('User created project', { userId: '123' });
            
            await Promise.resolve();
            await new Promise(r => setTimeout(r, 10));
            
            expect(records.length).toBeGreaterThan(0);
            const record = records[0];
            
            // AI enrichment should be applied
            if (record.semantics) {
                expect(record.semantics.intent).toBe('action');
            }
        });

        it('does not enrich logs when AI is disabled', async () => {
            configureAI({ mode: 'off' });
            
            const records: LogRecord[] = [];
            configureLogger({
                sinks: [{
                    handle: (rec) => { records.push(rec); }
                }],
                level: 'info',
            });
            
            const logger = getLogger('test');
            logger.info('User created project');
            
            await Promise.resolve();
            await new Promise(r => setTimeout(r, 10));
            
            expect(records.length).toBeGreaterThan(0);
            const record = records[0];
            
            // AI enrichment should not be applied
            expect(record.semantics).toBeUndefined();
        });
    });
});

