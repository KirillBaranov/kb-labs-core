/**
 * @module @kb-labs/sandbox/runner/ipc/message-types
 * IPC message type definitions
 */

import type { HandlerRef, ExecutionContext } from '../../types/index.js';
import type { SerializableContext } from '../ipc-serializer.js';

/**
 * IPC message from parent process
 */
export interface IpcMessage {
  type: 'RUN' | 'READY' | 'LOG' | 'ERR' | 'CRASH';
  payload?: {
    handlerRef?: HandlerRef;
    input?: unknown;
    ctx?: SerializableContext | ExecutionContext;
    error?: {
      code: string;
      message: string;
      stack?: string;
    };
    data?: unknown;
    report?: string;
    snapshotPath?: string;
    tracePath?: string;
    logPath?: string;
  };
}

/**
 * RUN message payload
 */
export interface RunMessagePayload {
  handlerRef: HandlerRef;
  input: unknown;
  ctx: SerializableContext | ExecutionContext;
}
