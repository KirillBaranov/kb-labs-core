/**
 * @module @kb-labs/core-sys/logging/context-window
 * Context window management for AI log analysis
 * 
 * Сохраняет предыдущие события и состояние системы для контекстного анализа.
 */

import type { LogRecord } from './types';

/**
 * Context window entry
 */
export interface ContextWindowEntry {
    /** Log record */
    log: LogRecord;
    /** Log ID */
    logId: string;
    /** Timestamp */
    timestamp: string;
}

/**
 * System state snapshot
 */
export interface SystemStateSnapshot {
    /** Snapshot timestamp */
    timestamp: string;
    /** System metrics */
    metrics?: {
        memory?: number;
        cpu?: number;
        activeConnections?: number;
        [key: string]: unknown;
    };
    /** Active contexts */
    contexts?: {
        traceId?: string;
        executionId?: string;
        requestId?: string;
        [key: string]: unknown;
    };
}

/**
 * Context window state
 */
interface ContextWindowState {
    /** Recent log entries */
    entries: ContextWindowEntry[];
    /** Maximum number of entries */
    maxEntries: number;
    /** System state snapshots */
    snapshots: SystemStateSnapshot[];
    /** Maximum number of snapshots */
    maxSnapshots: number;
    /** Enabled state */
    enabled: boolean;
}

const GLOBAL_CONTEXT_WINDOW_KEY = Symbol.for('@kb-labs/core-sys/logging/context-window');

function getContextWindowState(): ContextWindowState {
    const global = globalThis as typeof globalThis & { [GLOBAL_CONTEXT_WINDOW_KEY]?: ContextWindowState };
    if (!global[GLOBAL_CONTEXT_WINDOW_KEY]) {
        global[GLOBAL_CONTEXT_WINDOW_KEY] = {
            entries: [],
            maxEntries: 50,
            snapshots: [],
            maxSnapshots: 10,
            enabled: false,
        };
    }
    return global[GLOBAL_CONTEXT_WINDOW_KEY];
}

/**
 * Generate log ID (same as in causality-tracker)
 */
function generateLogId(rec: LogRecord): string {
    if (rec.trace && rec.span) {
        return `${rec.trace}:${rec.span}`;
    }
    const hash = `${rec.time}:${rec.category || 'unknown'}:${rec.msg || ''}`.slice(0, 50);
    return hash.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Add log to context window
 */
export function addToContextWindow(rec: LogRecord): void {
    const state = getContextWindowState();
    
    if (!state.enabled) {
        return;
    }
    
    const logId = generateLogId(rec);
    const entry: ContextWindowEntry = {
        log: rec,
        logId,
        timestamp: rec.time,
    };
    
    state.entries.push(entry);
    
    // Keep only recent entries
    if (state.entries.length > state.maxEntries) {
        state.entries.shift();
    }
}

/**
 * Get preceding events for a log
 */
export function getPrecedingEvents(
    logId: string,
    count: number = 10
): ContextWindowEntry[] {
    const state = getContextWindowState();
    
    const logIndex = state.entries.findIndex(e => e.logId === logId);
    if (logIndex === -1) {
        return [];
    }
    
    const startIndex = Math.max(0, logIndex - count);
    return state.entries.slice(startIndex, logIndex);
}

/**
 * Get preceding events by time window
 */
export function getPrecedingEventsByTime(
    timestamp: string,
    timeWindowMs: number = 5000
): ContextWindowEntry[] {
    const state = getContextWindowState();
    const targetTime = new Date(timestamp).getTime();
    
    return state.entries.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime < targetTime && (targetTime - entryTime) <= timeWindowMs;
    });
}

/**
 * Get events by execution context
 */
export function getEventsByExecution(executionId: string): ContextWindowEntry[] {
    const state = getContextWindowState();
    
    return state.entries.filter(entry => entry.log.executionId === executionId);
}

/**
 * Get events by trace
 */
export function getEventsByTrace(traceId: string): ContextWindowEntry[] {
    const state = getContextWindowState();
    
    return state.entries.filter(entry => entry.log.trace === traceId);
}

/**
 * Capture system state snapshot
 */
export function captureSystemStateSnapshot(snapshot: Omit<SystemStateSnapshot, 'timestamp'>): void {
    const state = getContextWindowState();
    
    if (!state.enabled) {
        return;
    }
    
    const fullSnapshot: SystemStateSnapshot = {
        ...snapshot,
        timestamp: new Date().toISOString(),
    };
    
    state.snapshots.push(fullSnapshot);
    
    // Keep only recent snapshots
    if (state.snapshots.length > state.maxSnapshots) {
        state.snapshots.shift();
    }
}

/**
 * Get system state snapshot closest to timestamp
 */
export function getSystemStateSnapshot(timestamp: string): SystemStateSnapshot | null {
    const state = getContextWindowState();
    
    if (state.snapshots.length === 0) {
        return null;
    }
    
    const targetTime = new Date(timestamp).getTime();
    let closest: SystemStateSnapshot | null = null;
    let minDiff = Infinity;
    
    for (const snapshot of state.snapshots) {
        const snapshotTime = new Date(snapshot.timestamp).getTime();
        const diff = Math.abs(snapshotTime - targetTime);
        if (diff < minDiff) {
            minDiff = diff;
            closest = snapshot;
        }
    }
    
    return closest;
}

/**
 * Enable context window
 */
export function enableContextWindow(options?: {
    maxEntries?: number;
    maxSnapshots?: number;
}): void {
    const state = getContextWindowState();
    state.enabled = true;
    
    if (options?.maxEntries !== undefined) {
        state.maxEntries = options.maxEntries;
    }
    
    if (options?.maxSnapshots !== undefined) {
        state.maxSnapshots = options.maxSnapshots;
    }
}

/**
 * Disable context window
 */
export function disableContextWindow(): void {
    const state = getContextWindowState();
    state.enabled = false;
}

/**
 * Clear context window (for testing)
 */
export function clearContextWindow(): void {
    const global = globalThis as typeof globalThis & { [GLOBAL_CONTEXT_WINDOW_KEY]?: ContextWindowState };
    if (global[GLOBAL_CONTEXT_WINDOW_KEY]) {
        global[GLOBAL_CONTEXT_WINDOW_KEY].entries = [];
        global[GLOBAL_CONTEXT_WINDOW_KEY].snapshots = [];
    }
}

/**
 * Get context window statistics
 */
export function getContextWindowStats(): {
    entryCount: number;
    maxEntries: number;
    snapshotCount: number;
    maxSnapshots: number;
    enabled: boolean;
} {
    const state = getContextWindowState();
    
    return {
        entryCount: state.entries.length,
        maxEntries: state.maxEntries,
        snapshotCount: state.snapshots.length,
        maxSnapshots: state.maxSnapshots,
        enabled: state.enabled,
    };
}

