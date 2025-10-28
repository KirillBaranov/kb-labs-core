/**
 * @module @kb-labs/core-bundle/api/explain-bundle
 * Bundle explanation logic
 */

import type {
  MergeTrace
} from '@kb-labs/core-config';
import { 
  explainProductConfig,
  ProductId
} from '@kb-labs/core-config';
import type { ExplainBundleOptions } from '../types/types';

/**
 * Explain bundle configuration (trace only)
 */
export async function explainBundle(opts: ExplainBundleOptions): Promise<MergeTrace[]> {
  const { cwd, product, cli } = opts;
  
  // Get configuration trace without resolving
  const result = await explainProductConfig({
    cwd,
    product,
    cli
  }, null);
  
  return result.trace;
}
