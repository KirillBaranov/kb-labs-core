/**
 * @module @kb-labs/core-sys/logging/causality-tracker
 * Causality tracking for log relationships
 * 
 * Отслеживает связи между логами для построения графа событий.
 * Позволяет AI анализировать причинно-следственные связи.
 */

import type { LogRecord } from './types';

/**
 * Relationship between logs
 */
export interface LogRelationship {
    /** Source log ID */
    fromLogId: string;
    /** Target log ID */
    toLogId: string;
    /** Type of relationship */
    relationship: 'caused-by' | 'triggered-by' | 'follows' | 'depends-on' | 'causes' | 'triggers' | 'precedes' | 'enables';
    /** Confidence level (0-1) */
    confidence?: number;
    /** Timestamp of relationship detection */
    detectedAt: string;
}

/**
 * Log group for related events
 */
export interface LogGroup {
    /** Group ID */
    groupId: string;
    /** Type of group */
    groupType: 'transaction' | 'workflow' | 'cascade' | 'session' | 'request';
    /** Log IDs in this group */
    logIds: string[];
    /** Start timestamp */
    startTime: string;
    /** End timestamp (if completed) */
    endTime?: string;
    /** Group metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Causality tracker state
 */
interface CausalityState {
    /** Recent logs (for relationship detection) */
    recentLogs: Array<LogRecord & { logId: string }>;
    /** Maximum number of recent logs to keep */
    maxRecentLogs: number;
    /** Detected relationships */
    relationships: Map<string, LogRelationship[]>;
    /** Active log groups */
    groups: Map<string, LogGroup>;
    /** Current execution context */
    executionContexts: Map<string, {
        executionId: string;
        startTime: string;
        logIds: string[];
    }>;
}

const GLOBAL_CAUSALITY_KEY = Symbol.for('@kb-labs/core-sys/logging/causality');

function getCausalityState(): CausalityState {
    const global = globalThis as typeof globalThis & { [GLOBAL_CAUSALITY_KEY]?: CausalityState };
    if (!global[GLOBAL_CAUSALITY_KEY]) {
        global[GLOBAL_CAUSALITY_KEY] = {
            recentLogs: [],
            maxRecentLogs: 100,
            relationships: new Map(),
            groups: new Map(),
            executionContexts: new Map(),
        };
    }
    return global[GLOBAL_CAUSALITY_KEY];
}

/**
 * Generate a unique log ID
 */
function generateLogId(rec: LogRecord): string {
    // Use trace + span if available, otherwise generate from timestamp + category + msg
    if (rec.trace && rec.span) {
        return `${rec.trace}:${rec.span}`;
    }
    const hash = `${rec.time}:${rec.category || 'unknown'}:${rec.msg || ''}`.slice(0, 50);
    return hash.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Detect relationships between current log and recent logs
 */
function detectRelationships(
    currentLog: LogRecord & { logId: string },
    recentLogs: Array<LogRecord & { logId: string }>
): LogRelationship[] {
    const relationships: LogRelationship[] = [];
    const now = new Date().toISOString();
    
    // Check for execution context relationships
    if (currentLog.executionId) {
        for (const recent of recentLogs) {
            if (recent.executionId === currentLog.executionId && recent.logId !== currentLog.logId) {
                relationships.push({
                    fromLogId: recent.logId,
                    toLogId: currentLog.logId,
                    relationship: 'follows',
                    confidence: 0.8,
                    detectedAt: now,
                });
            }
        }
    }
    
    // Check for trace/span relationships
    if (currentLog.trace && currentLog.parentSpan) {
        for (const recent of recentLogs) {
            if (recent.trace === currentLog.trace && recent.span === currentLog.parentSpan) {
                relationships.push({
                    fromLogId: recent.logId,
                    toLogId: currentLog.logId,
                    relationship: 'caused-by',
                    confidence: 0.9,
                    detectedAt: now,
                });
            }
        }
    }
    
    // Check for semantic relationships (error -> error, action -> action)
    if (currentLog.semantics) {
        for (const recent of recentLogs.slice(-10)) { // Check last 10 logs
            if (recent.semantics) {
                // Same domain and related operations
                if (
                    recent.semantics.domain === currentLog.semantics.domain &&
                    recent.semantics.intent === currentLog.semantics.intent
                ) {
                    // Check time proximity (within 5 seconds)
                    const timeDiff = new Date(currentLog.time).getTime() - new Date(recent.time).getTime();
                    if (timeDiff > 0 && timeDiff < 5000) {
                        relationships.push({
                            fromLogId: recent.logId,
                            toLogId: currentLog.logId,
                            relationship: 'follows',
                            confidence: 0.6,
                            detectedAt: now,
                        });
                    }
                }
                
                // Error after action in same domain
                if (
                    recent.semantics.intent === 'action' &&
                    currentLog.semantics.intent === 'error' &&
                    recent.semantics.domain === currentLog.semantics.domain
                ) {
                    const timeDiff = new Date(currentLog.time).getTime() - new Date(recent.time).getTime();
                    if (timeDiff > 0 && timeDiff < 10000) {
                        relationships.push({
                            fromLogId: recent.logId,
                            toLogId: currentLog.logId,
                            relationship: 'caused-by',
                            confidence: 0.7,
                            detectedAt: now,
                        });
                    }
                }
            }
        }
    }
    
    // Check for plugin/command relationships
    if (currentLog.plugin && currentLog.command) {
        for (const recent of recentLogs.slice(-5)) {
            if (recent.plugin === currentLog.plugin && recent.command === currentLog.command) {
                const timeDiff = new Date(currentLog.time).getTime() - new Date(recent.time).getTime();
                if (timeDiff > 0 && timeDiff < 30000) {
                    relationships.push({
                        fromLogId: recent.logId,
                        toLogId: currentLog.logId,
                        relationship: 'follows',
                        confidence: 0.5,
                        detectedAt: now,
                        });
                }
            }
        }
    }
    
    return relationships;
}

/**
 * Detect or create log group
 */
function detectGroup(
    log: LogRecord & { logId: string },
    recentLogs: Array<LogRecord & { logId: string }>
): LogGroup | null {
    const state = getCausalityState();
    
    // Check if log belongs to existing group
    if (log.executionId) {
        const groupId = `exec-${log.executionId}`;
        let group = state.groups.get(groupId);
        
        if (group) {
            // Add to existing group
            if (!group.logIds.includes(log.logId)) {
                group.logIds.push(log.logId);
            }
            if (!group.endTime && log.semantics?.outcome === 'success') {
                group.endTime = log.time;
            }
            return group;
        }
        
        // Always create group for execution
        const relatedLogs = recentLogs.filter(l => l.executionId === log.executionId);
        group = {
            groupId,
            groupType: 'workflow',
            logIds: [log.logId, ...relatedLogs.map(l => l.logId)],
            startTime: relatedLogs[0]?.time || log.time,
            metadata: {
                executionId: log.executionId,
                plugin: log.plugin,
                command: log.command,
            },
        };
        state.groups.set(group.groupId, group);
        return group;
    }
    
    // Check for transaction pattern (same trace, multiple related logs)
    if (log.trace) {
        const groupId = `trace-${log.trace}`;
        let group = state.groups.get(groupId);
        const relatedLogs = recentLogs.filter(l => l.trace === log.trace);
        
        if (group) {
            // Add to existing group
            if (!group.logIds.includes(log.logId)) {
                group.logIds.push(log.logId);
            }
            return group;
        }
        
        // Always create group for trace
        group = {
            groupId,
            groupType: 'transaction',
            logIds: [log.logId, ...relatedLogs.map(l => l.logId)],
            startTime: relatedLogs[0]?.time || log.time,
            metadata: {
                traceId: log.trace,
            },
        };
        state.groups.set(groupId, group);
        return group;
    }
    
    return null;
}

/**
 * Track causality for a log record
 */
export function trackCausality(rec: LogRecord): {
    relationships?: LogRecord['relationships'];
    group?: LogGroup;
} {
    const state = getCausalityState();
    
    // Generate log ID
    const logId = generateLogId(rec);
    const logWithId = { ...rec, logId };
    
    // Detect relationships
    const relationships = detectRelationships(logWithId, state.recentLogs);
    
    // Store relationships
    if (relationships.length > 0) {
        const existing = state.relationships.get(logId) || [];
        state.relationships.set(logId, [...existing, ...relationships]);
    }
    
    // Detect group
    const group = detectGroup(logWithId, state.recentLogs);
    
    // Add to recent logs
    state.recentLogs.push(logWithId);
    if (state.recentLogs.length > state.maxRecentLogs) {
        state.recentLogs.shift();
    }
    
    // Build relationships for log record
    const logRelationships: LogRecord['relationships'] = relationships.length > 0 ? {
        parents: relationships.map(rel => ({
            logId: rel.fromLogId,
            relationship: rel.relationship as any,
            confidence: rel.confidence,
        })),
    } : undefined;
    
    // Add group info if found
    if (group) {
        const groupInfo = {
            groupId: group.groupId,
            groupType: group.groupType,
            position: group.logIds.indexOf(logId),
        };
        
        if (!logRelationships) {
            return {
                relationships: {
                    group: groupInfo,
                },
                group: group,
            };
        }
        logRelationships.group = groupInfo;
    }
    
    return {
        relationships: logRelationships,
        group: group || undefined,
    };
}

/**
 * Get relationships for a log ID
 */
export function getLogRelationships(logId: string): LogRelationship[] {
    const state = getCausalityState();
    return state.relationships.get(logId) || [];
}

/**
 * Get log group by ID
 */
export function getLogGroup(groupId: string): LogGroup | undefined {
    const state = getCausalityState();
    return state.groups.get(groupId);
}

/**
 * Clear causality state (for testing)
 */
export function clearCausalityState(): void {
    const global = globalThis as typeof globalThis & { [GLOBAL_CAUSALITY_KEY]?: CausalityState };
    delete global[GLOBAL_CAUSALITY_KEY];
}

/**
 * Configure causality tracking
 */
export function configureCausalityTracking(options: {
    maxRecentLogs?: number;
}): void {
    const state = getCausalityState();
    if (options.maxRecentLogs !== undefined) {
        state.maxRecentLogs = options.maxRecentLogs;
    }
}

