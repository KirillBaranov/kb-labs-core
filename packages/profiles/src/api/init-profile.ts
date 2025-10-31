/**
 * @module @kb-labs/core-profiles/api/init-profile
 * Initialize profile with scaffolding
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  PROFILE_DIR,
  PROFILE_TEMPLATE_NODE_TS_LIB,
  DEFAULT_AI_REVIEW_CONFIG,
  DEFAULT_AI_REVIEW_RULES,
  DEFAULT_AI_REVIEW_PROMPT,
} from '../constants';
import { validateProfile } from './validate-profile';
import type { InitResult } from '@kb-labs/core-config';
import type { ProductId } from '@kb-labs/core-types';

export interface InitProfileOptions {
  cwd: string;
  profileKey: string;
  profileRef?: string;
  createLocalScaffold?: boolean;
  products?: ProductId[];
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Convert Windows paths to POSIX
 */
function toPosixPath(p: string): string {
  return p.split(path.sep).join('/');
}

/**
 * Generate unique profile name if conflict exists
 */
async function getUniqueProfileName(
  baseDir: string,
  baseName: string
): Promise<{ name: string; renamed: boolean }> {
  const profilePath = path.join(baseDir, PROFILE_DIR, baseName);
  
  try {
    await fs.access(profilePath);
    // Directory exists, try numbered variants
    for (let i = 2; i <= 10; i++) {
      const variantName = `${baseName}-${i}`;
      const variantPath = path.join(baseDir, PROFILE_DIR, variantName);
      try {
        await fs.access(variantPath);
      } catch {
        // Variant doesn't exist, use it
        return { name: variantName, renamed: true };
      }
    }
    // Give up after 10 attempts
    throw new Error(`Could not find unique name for profile ${baseName}`);
  } catch {
    // Directory doesn't exist, use base name
    return { name: baseName, renamed: false };
  }
}

/**
 * Initialize profile
 */
export async function initProfile(opts: InitProfileOptions): Promise<InitResult> {
  const cwd = path.resolve(opts.cwd);
  const result: InitResult = {
    actions: [],
    created: [],
    updated: [],
    skipped: [],
    warnings: [],
  };
  
  if (opts.createLocalScaffold) {
    // Create local profile scaffold
    const { writeFileAtomic, ensureWithinWorkspace } = await import('@kb-labs/core-config');
    
    // Determine profile name (with auto-rename if needed)
    const profileName = opts.profileRef?.startsWith('./')
      ? path.basename(opts.profileRef)
      : 'node-ts-lib';
    
    const { name: finalName, renamed } = await getUniqueProfileName(cwd, profileName);
    
    if (renamed) {
      result.warnings.push(
        `Profile name '${profileName}' already exists, using '${finalName}' instead`
      );
    }
    
    const profileDir = path.join(cwd, PROFILE_DIR, finalName);
    const profileJsonPath = path.join(profileDir, 'profile.json');
    
    // Ensure within workspace
    ensureWithinWorkspace(profileDir, cwd);
    
    // Prepare profile.json with POSIX paths
    const profileData = {
      ...PROFILE_TEMPLATE_NODE_TS_LIB,
      name: finalName,
    };
    
    // Create directories and files
    const products = opts.products || ['aiReview'];
    
    for (const product of products) {
      const fsProduct = product === 'aiReview' ? 'ai-review' : product;
      
      // Create defaults directory and file
      const defaultsDir = path.join(profileDir, 'defaults');
      const defaultsFile = path.join(defaultsDir, `${fsProduct}.json`);
      
      if (!opts.dryRun) {
        await fs.mkdir(defaultsDir, { recursive: true });
        await writeFileAtomic(defaultsFile, JSON.stringify(DEFAULT_AI_REVIEW_CONFIG, null, 2) + '\n');
      }
      result.created.push(toPosixPath(path.relative(cwd, defaultsFile)));
      
      // Create artifacts directory and files
      const artifactsDir = path.join(profileDir, 'artifacts', fsProduct);
      const rulesFile = path.join(artifactsDir, 'rules.yml');
      const promptsDir = path.join(artifactsDir, 'prompts');
      const promptFile = path.join(promptsDir, 'review.md');
      
      if (!opts.dryRun) {
        await fs.mkdir(promptsDir, { recursive: true });
        await writeFileAtomic(rulesFile, DEFAULT_AI_REVIEW_RULES);
        await writeFileAtomic(promptFile, DEFAULT_AI_REVIEW_PROMPT);
      }
      result.created.push(toPosixPath(path.relative(cwd, rulesFile)));
      result.created.push(toPosixPath(path.relative(cwd, promptFile)));
    }
    
    // Create product config file
    const productConfigDir = path.join(cwd, '.kb', 'ai-review');
    const productConfigFile = path.join(productConfigDir, 'ai-review.config.json');
    
    if (!opts.dryRun) {
      await fs.mkdir(productConfigDir, { recursive: true });
      await writeFileAtomic(productConfigFile, '{}\n');
    }
    result.created.push(toPosixPath(path.relative(cwd, productConfigFile)));
    
    // Write profile.json
    if (!opts.dryRun) {
      await fs.mkdir(profileDir, { recursive: true });
      await writeFileAtomic(profileJsonPath, JSON.stringify(profileData, null, 2) + '\n');
      
      // Validate the generated profile
      try {
        const profileContent = await fs.readFile(profileJsonPath, 'utf-8');
        const parsed = JSON.parse(profileContent);
        const validation = validateProfile(parsed);
        
        if (!validation.ok) {
          result.warnings.push(`Generated profile validation warning: ${validation.errors?.map(e => e.message).join(', ')}`);
        }
      } catch (error) {
        result.warnings.push(
          `Could not validate generated profile: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    
    result.created.push(toPosixPath(path.relative(cwd, profileJsonPath)));
    result.actions.push({ kind: 'write', path: profileJsonPath });
    
    // Update workspace config to reference this profile
    const { initWorkspaceConfig } = await import('@kb-labs/core-config');
    const workspaceResult = await initWorkspaceConfig({
      cwd,
      profiles: {
        [opts.profileKey]: `./.kb/profiles/${finalName}`,
      },
      products,
      dryRun: opts.dryRun,
      force: opts.force,
    });
    
    result.actions.push(...workspaceResult.actions);
    result.created.push(...workspaceResult.created);
    result.updated.push(...workspaceResult.updated);
    result.warnings.push(...workspaceResult.warnings);
  } else if (opts.profileRef) {
    // Just update workspace config with profile ref (npm or local path)
    const { initWorkspaceConfig } = await import('@kb-labs/core-config');
    const workspaceResult = await initWorkspaceConfig({
      cwd,
      profiles: {
        [opts.profileKey]: opts.profileRef,
      },
      dryRun: opts.dryRun,
      force: opts.force,
    });
    
    result.actions.push(...workspaceResult.actions);
    result.created.push(...workspaceResult.created);
    result.updated.push(...workspaceResult.updated);
    result.warnings.push(...workspaceResult.warnings);
  }
  
  return result;
}

