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
} from '../packages/config/src';

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
} from '../packages/sys/src';
