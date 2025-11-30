/**
 * @module @kb-labs/core-profiles/meta/build-meta
 * Build resolver metadata for debugging and analytics
 */

export interface ResolvedMetaExtra {
  createdAt: string;
  resolver: {
    version: string;
    strict: boolean;
    logLevel: string;
  };
  source: {
    cwd: string;
    pathAbs: string;
    repoRoot: string;
  };
  chains: {
    extends: string[];
    overrides: string[];
  };
  counts: {
    files: number;
  };
  trace: {
    stages?: {
      load?: number;
      merge?: number;
      validate?: number;
    };
  };
}

export interface BuildMetaOptions {
  cwd: string;
  profilePathAbs: string;
  repoRoot: string;
  strict: boolean;
  logLevel: string;
  extendsChain: string[];
  overridesChain: string[];
  files: string[];
}

/**
 * Build resolver metadata for debugging and analytics
 * 
 * @param options - Metadata building options
 * @returns ResolvedMetaExtra object
 */
export function buildMeta(options: BuildMetaOptions): ResolvedMetaExtra {
  const {
    cwd,
    profilePathAbs,
    repoRoot,
    strict,
    logLevel,
    extendsChain,
    overridesChain,
    files
  } = options;

  return {
    createdAt: new Date().toISOString(),
    resolver: {
      version: '0.1.0',
      strict,
      logLevel
    },
    source: {
      cwd,
      pathAbs: profilePathAbs,
      repoRoot
    },
    chains: {
      extends: extendsChain,
      overrides: overridesChain
    },
    counts: {
      files: files.length
    },
    trace: {
      stages: {} // Will be populated later
    }
  };
}
