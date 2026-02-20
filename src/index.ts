// Explicitly export config package API
export {
  // Types
  type Diagnostic,
  type JsonReadResult,
  type FindNearestConfigOpts,
  type ResolveConfigArgs,

  // Functions
  findNearestConfig,
  readJsonWithDiagnostics,
  pickDefined,
  mergeDefined,
  resolveConfig,

  // Utils
  toBool,
  toInt
} from '@kb-labs/core-config';

export {
  resolveWorkspaceRoot,
  type ResolveWorkspaceRootOptions,
  type WorkspaceRootResolution,
} from '@kb-labs/core-workspace';
