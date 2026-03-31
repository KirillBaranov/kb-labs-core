/**
 * @module @kb-labs/core-registry/state/plugin-state
 * Plugin state management — .kb/plugins.json.
 * Moved from @kb-labs/cli-commands/registry/plugins-state.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

export interface PluginState {
  enabled: string[];
  disabled: string[];
  linked: string[];
  permissions: Record<string, string[]>;
  integrity: Record<string, string>;
  crashes: Record<string, number>;
  lastUpdated: number;
}

const DEFAULT_STATE: PluginState = {
  enabled: [],
  disabled: [],
  linked: [],
  permissions: {},
  integrity: {},
  crashes: {},
  lastUpdated: Date.now(),
};

export function getPluginsStatePath(root: string): string {
  return path.join(root, '.kb', 'plugins.json');
}

export async function loadPluginsState(root: string): Promise<PluginState> {
  try {
    const content = await fs.readFile(getPluginsStatePath(root), 'utf8');
    const state = JSON.parse(content) as Partial<PluginState>;
    return {
      ...DEFAULT_STATE,
      ...state,
      enabled: state.enabled || [],
      disabled: state.disabled || [],
      linked: state.linked || [],
      permissions: state.permissions || {},
      integrity: state.integrity || {},
      crashes: state.crashes || {},
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function savePluginsState(root: string, state: PluginState): Promise<void> {
  const statePath = getPluginsStatePath(root);
  const dir = path.dirname(statePath);
  await fs.mkdir(dir, { recursive: true });

  const toWrite = { ...state, lastUpdated: Date.now() };
  const tmpPath = `${statePath}.tmp.${process.pid}`;
  await fs.writeFile(tmpPath, JSON.stringify(toWrite, null, 2), 'utf8');
  await fs.rename(tmpPath, statePath);
}

export function isPluginEnabled(state: PluginState, packageName: string, defaultEnabled = false): boolean {
  if (state.disabled.includes(packageName)) return false;
  if (state.enabled.includes(packageName)) return true;
  return defaultEnabled;
}

export async function enablePlugin(root: string, packageName: string): Promise<void> {
  const state = await loadPluginsState(root);
  if (!state.enabled.includes(packageName)) state.enabled.push(packageName);
  state.disabled = state.disabled.filter(p => p !== packageName);
  await savePluginsState(root, state);
}

export async function disablePlugin(root: string, packageName: string): Promise<void> {
  const state = await loadPluginsState(root);
  if (!state.disabled.includes(packageName)) state.disabled.push(packageName);
  state.enabled = state.enabled.filter(p => p !== packageName);
  await savePluginsState(root, state);
}

export async function recordCrash(root: string, packageName: string): Promise<void> {
  const state = await loadPluginsState(root);
  state.crashes[packageName] = (state.crashes[packageName] || 0) + 1;
  if (state.crashes[packageName]! >= 3 && !state.disabled.includes(packageName)) {
    state.disabled.push(packageName);
  }
  await savePluginsState(root, state);
}

export async function computePackageIntegrity(pkgRoot: string): Promise<string> {
  try {
    const content = await fs.readFile(path.join(pkgRoot, 'package.json'), 'utf8');
    return `sha256-${createHash('sha256').update(content).digest('base64')}`;
  } catch {
    return '';
  }
}
