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
  // Types
  type LogLevel,
  type LogRecord,
  type LogSink,
  type Redactor,
  type ConfigureOpts,
  type Logger,

  // Functions
  configureLogger,
  configureFromEnv,
  addSink,
  removeSink,
  setLogLevel,
  getLogger,
  createRedactor,
  stdoutSink,
  jsonSink,
  toAbsolute,
  findRepoRoot
} from '@kb-labs/core-sys';

export {
  // Profile Functions
  loadProfile,
  validateProfile,
  mergeProfiles,
  resolveProfile,

  // Profile Service
  ProfileService,

  // Types
  type RawProfile,
  type ResolvedProfile,
  type ResolveOptions,

  // Error Classes
  ProfileNotFoundError,
  ExtendResolutionError,
  SchemaValidationError
} from '@kb-labs/core-profiles';

export {
  resolveWorkspaceRoot,
  type ResolveWorkspaceRootOptions,
  type WorkspaceRootResolution,
} from '@kb-labs/core-workspace';
