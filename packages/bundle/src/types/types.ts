/**
 * @module @kb-labs/core-bundle/types/types
 * Bundle system types
 */

import type { ProductId } from '@kb-labs/core-types';
import type { MergeTrace, BundleProfile } from '@kb-labs/core-config';
import type { ArtifactMetadata } from '@kb-labs/core-profiles';

export interface LoadBundleOptions {
  /**
   * Explicit workspace root. If omitted, the resolver will derive it.
   */
  cwd?: string;
  product: ProductId;
  /**
   * Preferred profile identifier (Profiles v2). Falls back to default selection.
   */
  profileId?: string;
  /**
   * Optional explicit scope identifier (within the resolved profile).
   */
  scopeId?: string;
  cli?: Record<string, unknown>;
  writeFinalConfig?: boolean;
  validate?: boolean | 'warn';
}

export interface Bundle<T = any> {
  product: ProductId;
  config: T;
  profile: BundleProfile | null;
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
  /**
   * Explicit workspace root. If omitted, the resolver will derive it.
   */
  cwd?: string;
  product: ProductId;
  profileId?: string;
  scopeId?: string;
  cli?: Record<string, unknown>;
}

// Re-export ProductId for CLI validation
export type { ProductId } from '@kb-labs/core-types';
