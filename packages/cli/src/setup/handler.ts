import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, join } from 'node:path';

type SetupContext = {
  cwd?: string;
  runtime?: {
    log?: (
      level: 'debug' | 'info' | 'warn' | 'error',
      message: string,
      meta?: Record<string, unknown>
    ) => void;
  };
};

/**
 * Setup handler for Core CLI
 * Creates basic .kb directory structure and initial configuration files
 */
export async function run(ctx: SetupContext = {}) {
  const cwd = ctx.cwd ?? process.cwd();
  const kbDir = join(cwd, '.kb');
  const created: string[] = [];

  // Create .kb directory
  await mkdir(kbDir, { recursive: true });
  created.push(kbDir);

  // Create .gitignore in .kb
  await ensureFile(
    join(kbDir, '.gitignore'),
    [
      '# KB Labs workspace artifacts',
      '# Generated files and cache',
      '**/*.json',
      '**/*.md',
      'cache/',
      'artifacts/',
      '',
      '# Keep directory structure',
      '!.gitignore',
      '!README.md',
      '',
    ].join('\n')
  );

  // Create README.md in .kb
  await ensureFile(
    join(kbDir, 'README.md'),
    [
      '# KB Labs Workspace',
      '',
      'This directory stores KB Labs configuration, profiles, artifacts, and workspace state.',
      '',
      '## Structure',
      '',
      '- `kb-labs.config.*` or `kb.config.*` - Workspace configuration',
      '- `.kb/**/` - Plugin-specific artifacts (audit, analytics, mind, etc.)',
      '',
      '## Files',
      '',
      'Most files in this directory are auto-generated and should not be committed.',
      'Only configuration files (`kb-labs.config.*` or `kb.config.*`) should be tracked in git.',
      '',
    ].join('\n')
  );

  ctx.runtime?.log?.('info', 'Core CLI setup completed', { cwd, created });

  return {
    ok: true,
    kbDir,
    created,
  };
}

async function ensureFile(path: string, contents: string) {
  try {
    await access(path, fsConstants.F_OK);
  } catch {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, 'utf-8');
  }
}

