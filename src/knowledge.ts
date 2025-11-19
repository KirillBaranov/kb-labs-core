import { readKbConfig } from '@kb-labs/core-config';
import type {
  KnowledgeCapabilityRegistry,
  KnowledgeConfigInput,
  KnowledgeProfile,
} from '@kb-labs/knowledge-contracts';
import {
  createKnowledgeError,
  createKnowledgeEngineRegistry,
  createKnowledgeService,
  type KnowledgeEngineRegistry,
  type KnowledgeLogger,
  type KnowledgeService,
} from '@kb-labs/knowledge-core';

export interface KnowledgeClientOptions {
  /**
   * Working directory (used to locate kb.config.*)
   */
  cwd: string;
  /**
   * Registered product capabilities.
   */
  capabilities: KnowledgeCapabilityRegistry;
  /**
   * Optional profile overrides.
   */
  profiles?: KnowledgeProfile[];
  /**
   * Optional workspace root override (defaults to cwd).
   */
  workspaceRoot?: string;
  /**
   * Optional logger passed to knowledge-core.
   */
  logger?: KnowledgeLogger;
  /**
   * Provide an explicit knowledge config instead of reading kb.config.
   */
  configOverride?: KnowledgeConfigInput;
  /**
   * Optional registry initializer to register custom engines before creating the service.
   */
  registryInitializer?: (registry: KnowledgeEngineRegistry) => void;
}

export async function loadKnowledgeConfig(
  cwd: string,
): Promise<KnowledgeConfigInput> {
  const kbConfig = await readKbConfig(cwd);
  if (!kbConfig?.data || typeof kbConfig.data !== 'object') {
    throw createKnowledgeError(
      'KNOWLEDGE_CONFIG_INVALID',
      `Unable to locate kb.config.* from ${cwd}`,
      { meta: { cwd } },
    );
  }

  const knowledgeConfig = (kbConfig.data as Record<string, unknown>)
    .knowledge as KnowledgeConfigInput | undefined;

  if (!knowledgeConfig) {
    throw createKnowledgeError(
      'KNOWLEDGE_CONFIG_INVALID',
      'kb.config is missing the "knowledge" section.',
      { meta: { cwd } },
    );
  }

  return knowledgeConfig;
}

export async function createKnowledgeClientFromConfig(
  options: KnowledgeClientOptions,
): Promise<KnowledgeService> {
  const config =
    options.configOverride ?? (await loadKnowledgeConfig(options.cwd));
  const logger = resolveKnowledgeLogger(options.logger);
  const registry = createKnowledgeEngineRegistry(logger);
  options.registryInitializer?.(registry);

  return createKnowledgeService({
    config,
    capabilities: options.capabilities,
    profiles: options.profiles,
    workspaceRoot: options.workspaceRoot ?? options.cwd,
    logger,
    registry,
  });
}

function resolveKnowledgeLogger(
  logger?: KnowledgeLogger,
): KnowledgeLogger {
  if (logger) {
    return logger;
  }
  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
  };
}
