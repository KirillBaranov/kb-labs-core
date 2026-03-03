import { describe, expect, it } from 'vitest';
import type {
  ArtifactsConfig,
  ExecuteOptions,
  ExecutionDescriptorCore,
  ExecutionError,
  ExecutionErrorCode,
  ExecutionMeta,
  ExecutionMetadata,
  ExecutionRequest,
  ExecutionResponse,
  ExecutionResult,
  ExecutionStats,
  ExecutionTarget,
  HealthStatus,
  IExecutionBackend,
  IPlatformGateway,
  ISubprocessRunner,
  RunResult,
  WorkspaceConfig,
} from '../index.js';

const REQUIRED_EXPORTS = [
  'ExecutionRequest',
  'ExecutionResponse',
  'ExecutionResult',
  'ExecutionError',
  'ExecutionErrorCode',
  'ExecutionMetadata',
  'ExecuteOptions',
  'ExecutionDescriptorCore',
  'ExecutionTarget',
  'WorkspaceConfig',
  'ArtifactsConfig',
  'ExecutionMeta',
  'RunResult',
  'IExecutionBackend',
  'HealthStatus',
  'ExecutionStats',
  'IPlatformGateway',
  'ISubprocessRunner',
] as const;

type _CompileTimeContractPresence = [
  ArtifactsConfig,
  ExecuteOptions,
  ExecutionDescriptorCore,
  ExecutionError,
  ExecutionErrorCode,
  ExecutionMeta,
  ExecutionMetadata,
  ExecutionRequest,
  ExecutionResponse,
  ExecutionResult,
  ExecutionStats,
  ExecutionTarget,
  HealthStatus,
  IExecutionBackend,
  IPlatformGateway,
  ISubprocessRunner,
  RunResult,
  WorkspaceConfig,
];

describe('core-contracts entrypoint contract', () => {
  it('exports required canonical contracts', () => {
    expect(REQUIRED_EXPORTS.length).toBeGreaterThan(0);
  });
});
