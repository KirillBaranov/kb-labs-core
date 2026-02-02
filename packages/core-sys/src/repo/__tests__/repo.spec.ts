import { describe, it, expect } from 'vitest'
import { promises as fsp } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { findRepoRoot } from '../repo'

async function mkd(prefix = 'kb-core-sys-repo-') {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix))
}

describe('findRepoRoot', () => {
  it('finds directory containing any marker (e.g., .git) when called from subdir', async () => {
    const root = await mkd()
    const sub = path.join(root, 'a/b/c')
    await fsp.mkdir(sub, { recursive: true })
    await fsp.mkdir(path.join(root, '.git'))

    const found = await findRepoRoot(sub)
    expect(found).toBe(root)
  })

  it('falls back to FS root if no marker is found up the tree', async () => {
    const start = await mkd()
    const found = await findRepoRoot(start)
    // Implementation returns FS root when no markers are found
    expect(found).toBe(path.parse(start).root)
  })
})


