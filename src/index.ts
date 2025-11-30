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
  type InitLoggingOptions,
  type LogContext,

  // Functions
  configureLogger,
  configureFromEnv,
  addSink,
  removeSink,
  setLogLevel,
  getLogLevel,
  getLogger,
  createRedactor,
  stdoutSink,
  jsonSink,
  initLogging,
  resetLogging,
  consoleLog,
  consoleError,
  consoleWarn,
  consoleDebug,
  getCurrentLogLevel,
  setLogContext,
  getLogContext,
  clearLogContext,
  withLogContext,
  mergeLogContext,
  toAbsolute,
  findRepoRoot
} from '@kb-labs/core-sys/logging';

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

export {
  loadKnowledgeConfig,
  createKnowledgeClientFromConfig,
  type KnowledgeClientOptions,
} from './knowledge';
