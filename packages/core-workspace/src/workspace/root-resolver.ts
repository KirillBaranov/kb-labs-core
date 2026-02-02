import path from 'node:path'
import { promises as fsp } from 'node:fs'

import { findRepoRoot } from '@kb-labs/core-sys'

import type {
  ResolveWorkspaceRootOptions,
  WorkspaceFs,
  WorkspaceRootResolution,
} from './types'

const WORKSPACE_CONFIG_RELATIVE = path.join('.kb', 'kb.config.json')

const defaultFs: WorkspaceFs = {
  async exists(target: string): Promise<boolean> {
    try {
      await fsp.access(target)
      return true
    } catch {
      return false
    }
  },
}

function resolveEnvRoot(
  env: Record<string, string | undefined> | undefined,
): string | undefined {
  if (!env) {return undefined}
  return env.KB_LABS_WORKSPACE_ROOT ?? env.KB_LABS_REPO_ROOT
}

async function findConfigRoot(
  startDir: string,
  fs: WorkspaceFs,
): Promise<string | undefined> {
  let current = path.resolve(startDir)

  while (true) {
    const configPath = path.join(current, WORKSPACE_CONFIG_RELATIVE)
    // eslint-disable-next-line no-await-in-loop -- Searching for workspace root: must check each directory sequentially
    if (await fs.exists(configPath)) {
      return current
    }

    const parent = path.dirname(current)
    if (parent === current) {
      return undefined
    }

    current = parent
  }
}

/**
 * Resolve the workspace root for kb-labs tooling.
 *
 * Priority order:
 * 1. Explicit `cwd` option (e.g. CLI flag)
 * 2. Environment variables (`KB_LABS_WORKSPACE_ROOT`, `KB_LABS_REPO_ROOT`)
 * 3. Nearest `.kb/kb-labs.config.json` ancestor
 * 4. Repository root discovered via `findRepoRoot`
 * 5. Fallback to provided `startDir` / process cwd
 */
export async function resolveWorkspaceRoot(
  options: ResolveWorkspaceRootOptions = {},
): Promise<WorkspaceRootResolution> {
  const {
    cwd,
    env = process.env,
    fs = defaultFs,
    startDir = process.cwd(),
  } = options

  if (cwd) {
    return {
      rootDir: path.resolve(cwd),
      source: 'explicit',
    }
  }

  const envRoot = resolveEnvRoot(env)
  if (envRoot) {
    return {
      rootDir: path.resolve(envRoot),
      source: 'env',
    }
  }

  const configRoot = await findConfigRoot(startDir, fs)
  if (configRoot) {
    return {
      rootDir: configRoot,
      source: 'config',
    }
  }

  try {
    const repoRoot = await findRepoRoot(startDir)
    const resolvedRepo = path.resolve(repoRoot)
    const fsRoot = path.parse(resolvedRepo).root

    if (resolvedRepo !== fsRoot) {
      return {
        rootDir: resolvedRepo,
        source: 'repo',
      }
    }
  } catch {
    // swallow and fall through to fallback
  }

  return {
    rootDir: path.resolve(startDir),
    source: 'fallback',
  }
}

