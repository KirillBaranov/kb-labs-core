/**
 * @module @kb-labs/core-bundle/types/types
 * Bundle system types
 */

import type { ProductId, MergeTrace } from '@kb-labs/core-config';
import type { ArtifactMetadata } from '@kb-labs/core-profiles';

export interface LoadBundleOptions {
  cwd: string;
  product: ProductId;
  profileKey?: string;
  cli?: Record<string, unknown>;
  writeFinalConfig?: boolean;
}

export interface Bundle<T = any> {
  product: ProductId;
  config: T;
  profile: {
    key: string;
    name: string;
    version: string;
    overlays?: string[];
  };
  artifacts: {
    summary: Record<string, string[]>; // kebab-case keys from exports
    list(key: string): Promise<Array<{ relPath: string; sha256: string }>>;
    materialize(keys?: string[]): Promise<{
      filesCopied: number;
      filesSkipped: number;
      bytesWritten: number;
    }>;
    // Convenience methods for better DX
    readText(relPath: string): Promise<string>;
    readJson<T = any>(relPath: string): Promise<T>;
    readAll(key: string): Promise<Array<{ path: string; content: string }>>;
  };
  policy: {
    bundle?: string;
    permits: (action: string, resource?: any) => boolean;
  };
  trace: MergeTrace[];
}

export interface ExplainBundleOptions {
  cwd: string;
  product: ProductId;
  profileKey?: string;
  cli?: Record<string, unknown>;
}

// Re-export ProductId for CLI validation
export type { ProductId } from '@kb-labs/core-config';
