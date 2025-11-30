/**
 * @module @kb-labs/core-profiles/load-profile
 * Profile loading functionality - I/O only, no validation
 */

import path from "node:path";
import { readJsonWithDiagnostics } from "@kb-labs/core-config";
import { getLogger } from "@kb-labs/core-sys";
import { ProfileNotFoundError } from "../errors";
import type { RawProfile, LoadProfileResult } from "../types";

export interface LoadProfileOptions {
  /** Working directory to search from (default: process.cwd()) */
  cwd?: string;
  /** Profile name to load (default: "default") */
  name?: string;
  /** Direct path to profile JSON file */
  path?: string;
}

/**
 * Load a profile without validation - I/O only
 * 
 * @param opts - Loading options
 * @returns Promise resolving to the loaded profile with metadata
 * @throws ProfileNotFoundError if profile file doesn't exist
 */
export async function loadProfile(opts: LoadProfileOptions = {}): Promise<LoadProfileResult> {
  const { cwd = process.cwd(), name = "default", path: profilePath } = opts;
  const logger = getLogger();

  let finalPath: string;
  let repoRoot: string;

  if (profilePath) {
    // Direct path provided
    finalPath = profilePath;
    repoRoot = process.cwd(); // Use current working directory as repo root
    logger.debug(`Loading profile from direct path: ${finalPath}`);
  } else {
    // Search in .kb/profiles/<name>/profile.json
    finalPath = path.join(cwd, ".kb", "profiles", name, "profile.json");
    repoRoot = cwd;
    logger.debug(`Loading profile from: ${finalPath}`);
  }

  // Read JSON file with diagnostics
  const readResult = await readJsonWithDiagnostics(finalPath);

  if (!readResult.ok) {
    // Check if it's a file not found error
    const fileNotFound = readResult.diagnostics.some(d =>
      d.code === "FILE_READ_FAILED" &&
      d.level !== "info" &&
      typeof d.detail === "string" &&
      d.detail.includes("ENOENT")
    );

    if (fileNotFound) {
      logger.error(`Profile not found: ${finalPath}`);
      throw new ProfileNotFoundError(finalPath);
    }

    // Other read errors
    logger.error(`Failed to read profile file: ${finalPath}`, { diagnostics: readResult.diagnostics });
    throw new ProfileNotFoundError(finalPath);
  }

  logger.info(`Successfully loaded profile from: ${finalPath}`);

  return {
    profile: readResult.data as RawProfile,
    meta: {
      pathAbs: finalPath,
      repoRoot
    }
  };
}
