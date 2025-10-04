import { loadWithExtendsAndOverrides, loadRulesFrom } from '../loader';
import { mergeProfiles } from './merge';
import { resolveIo, hasIoConflicts } from '../io';
import { validateProfile, validateRulesArray } from '../validator';
import { AllowDenyConflictError, ProfileSchemaError } from '../errors';
import type { ResolvedProfile } from '../types';

export type ResolveOpts = {
  cwd?: string;
  name?: string;
  product?: 'review' | 'tests' | 'docs' | 'assistant';
  strict?: boolean;
};

// ResolvedProfile type is imported from types module

export async function resolveProfile(opts: ResolveOpts = {}): Promise<ResolvedProfile> {
  const { cwd, name = 'default', strict = true } = opts;

  // 1) загрузка профиля + цепочки extends/overrides
  const { dir, json, parents, overrideFiles } = await loadWithExtendsAndOverrides({ cwd, name });

  // 2) порядок: extends (лево→право) → overrides (лево→право) → локалка
  const chain = [...parents, ...overrideFiles, json];

  // 3) merge
  const merged = mergeProfiles(chain);

  // 4) валидация схемой
  const v = validateProfile(merged);
  if (!v.ok && strict) {
    throw new ProfileSchemaError(v.errors);
  }

  // 4.5) загрузка и валидация правил
  const { rules: loadedRules } = await loadRulesFrom({ cwd, name });
  const rulesValidation = validateRulesArray(loadedRules);
  if (!rulesValidation.ok && strict) {
    throw new ProfileSchemaError(rulesValidation.errors);
  }

  // 5) io/diff/capabilities: базовая сводка с конфликт-чеком
  const baseIo = (merged as any)?.defaults?.io;
  const prodEntries = Object.entries((merged as any).products ?? {});
  const normProducts: Record<string, any> = {};

  for (const [k, cfg] of prodEntries) {
    const io = resolveIo(baseIo, (cfg as any)?.io);
    if (strict && hasIoConflicts(io)) {
      // 1й конфликт — повод упасть (MVP)
      throw new AllowDenyConflictError(`products.${k}.io`, io.conflicts[0]!);
    }
    normProducts[k] = { ...(cfg as any), io };
  }

  // 6) собрать контракт
  const resolved: ResolvedProfile = {
    name: String((merged as any).name ?? name),
    kind: (merged as any).kind,
    scope: (merged as any).scope,
    version: (merged as any).version ?? '0.0.0',
    roots: [dir],
    files: [], // позже добавим монтированные артефакты
    rules: loadedRules,
    products: normProducts,
    meta: (merged as any).metadata ?? {},
  };

  return resolved;
}