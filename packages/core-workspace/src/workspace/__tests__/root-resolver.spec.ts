import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import { resolveWorkspaceRoot } from '../root-resolver'

describe('resolveWorkspaceRoot', () => {
  let tmpDir: string
  let originalCwd: string

  beforeAll(() => {
    originalCwd = process.cwd()
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'kb-workspace-'))
  })

afterEach(() => {
  process.chdir(tmpDir)
})

  afterAll(() => {
    process.chdir(originalCwd)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns explicit cwd when provided', async () => {
    const explicit = path.join(tmpDir, 'explicit-root')
    const result = await resolveWorkspaceRoot({ cwd: explicit })

    expect(result).toEqual({
      rootDir: path.resolve(explicit),
      source: 'explicit',
    })
  })

  it('prefers environment variables when set', async () => {
    const envRoot = path.join(tmpDir, 'env-root')
    const result = await resolveWorkspaceRoot({
      env: { KB_LABS_WORKSPACE_ROOT: envRoot },
    })

    expect(result).toEqual({
      rootDir: path.resolve(envRoot),
      source: 'env',
    })
  })

  it('finds nearest kb-labs config ancestor', async () => {
    const umbrella = path.join(tmpDir, 'umbrella')
    const child = path.join(umbrella, 'packages', 'foo')
    const configDir = path.join(umbrella, '.kb')

    mkdirSync(child, { recursive: true })
    mkdirSync(configDir, { recursive: true })

    // create required directories
    writeFileSync(
      path.join(configDir, 'kb-labs.config.json'),
      JSON.stringify({ name: 'umbrella' }),
    )

    process.chdir(child)

    const result = await resolveWorkspaceRoot({ startDir: child })

    expect(result.rootDir).toEqual(path.resolve(umbrella))
    expect(result.source).toBe('config')
  })

  it('falls back to repo root when config missing', async () => {
    const repoRoot = path.join(tmpDir, 'repo-fallback')
    const nested = path.join(repoRoot, 'nested', 'dir')

    mkdirSync(nested, { recursive: true })
    writeFileSync(path.join(repoRoot, 'package.json'), '{"name":"workspace"}')

    process.chdir(nested)

    const result = await resolveWorkspaceRoot({ startDir: nested })

    expect(result.rootDir).toEqual(path.resolve(repoRoot))
    expect(result.source).toBe('repo')
  })

  it('returns fallback when no markers found', async () => {
    const lonely = path.join(tmpDir, 'lonely')
    mkdirSync(lonely, { recursive: true })
    process.chdir(lonely)

    const result = await resolveWorkspaceRoot({ startDir: lonely })

    expect(result.rootDir).toEqual(path.resolve(lonely))
    expect(result.source).toBe('fallback')
  })
})

