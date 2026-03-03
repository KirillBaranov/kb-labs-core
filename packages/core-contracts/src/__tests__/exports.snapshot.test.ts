import { describe, expect, it } from 'vitest';

describe('core-contracts export surface snapshot', () => {
  it('matches entrypoint export keys', () => {
    const expectedSurface = [
      'ArtifactsConfig',
      'ExecuteOptions',
      'ExecutionDescriptorCore',
      'ExecutionError',
      'ExecutionErrorCode',
      'ExecutionMeta',
      'ExecutionMetadata',
      'ExecutionRequest',
      'ExecutionResponse',
      'ExecutionResult',
      'ExecutionStats',
      'ExecutionTarget',
      'HealthStatus',
      'IExecutionBackend',
      'IPlatformGateway',
      'ISubprocessRunner',
      'RunResult',
      'WorkspaceConfig',
    ].sort();

    expect(expectedSurface).toMatchInlineSnapshot(`
      [
        "ArtifactsConfig",
        "ExecuteOptions",
        "ExecutionDescriptorCore",
        "ExecutionError",
        "ExecutionErrorCode",
        "ExecutionMeta",
        "ExecutionMetadata",
        "ExecutionRequest",
        "ExecutionResponse",
        "ExecutionResult",
        "ExecutionStats",
        "ExecutionTarget",
        "HealthStatus",
        "IExecutionBackend",
        "IPlatformGateway",
        "ISubprocessRunner",
        "RunResult",
        "WorkspaceConfig",
      ]
    `);
  });
});
