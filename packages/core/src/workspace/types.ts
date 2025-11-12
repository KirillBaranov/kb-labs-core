export interface WorkspaceRootResolution {
  rootDir: string
  source: 'explicit' | 'env' | 'config' | 'repo' | 'fallback'
}

export interface ResolveWorkspaceRootOptions {
  /**
   * Explicit root directory to use (e.g. from CLI flag). Highest priority.
   */
  cwd?: string
  /**
   * Starting directory for discovery. Defaults to process.cwd().
   */
  startDir?: string
  /**
   * Environment variables map. Defaults to process.env.
   */
  env?: Record<string, string | undefined>
  /**
   * Optionally inject custom filesystem helpers for testing.
   */
  fs?: WorkspaceFs
  /**
   * When true, includes additional metadata in errors/logs.
   */
  verbose?: boolean
}

export interface WorkspaceFs {
  exists(path: string): Promise<boolean>
}

