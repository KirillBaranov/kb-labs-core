/**
 * @module @kb-labs/core/sys/repo
 * Repository root discovery. Pure infrastructure, no domain keys.
 */

import path from "node:path";
import { promises as fsp } from "node:fs";

/**
 * Find repository root by searching for markers in priority order.
 * First searches entire tree for pnpm-workspace.yaml (monorepo root),
 * then .git, then package.json as fallback.
 */
export async function findRepoRoot(startDir = process.cwd()): Promise<string> {
    const markersPriority = ["pnpm-workspace.yaml", ".git", "package.json"];

    // Try each marker in priority order, searching entire tree each time
    for (const marker of markersPriority) {
        let dir = path.resolve(startDir);
        while (true) {
            try {
                await fsp.access(path.join(dir, marker));
                return dir; // Found it!
            } catch {
                // Continue searching upward
            }

            const parent = path.dirname(dir);
            if (parent === dir) {
                // Reached filesystem root without finding this marker
                break;
            }
            dir = parent;
        }
    }

    // Fallback: return current directory if nothing found
    return path.resolve(startDir);
}