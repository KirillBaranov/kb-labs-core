/**
 * @module @kb-labs/core-profiles/loader
 * Profile loading functionality
 */

import path from "node:path";
import { readJsonWithDiagnostics } from "@kb-labs/core-config";
import { getLogger } from "@kb-labs/core-sys";
import { promises as fs } from "node:fs";
import { glob } from "glob";
import { validateProfile, getValidatorById } from "../validator";
import { ProfileNotFoundError, ProfileSchemaError } from "../errors";
import { SCHEMA_ID } from "../constants";

export interface LoadProfileOptions {
  /** Profile name to load (default: "default") */
  name?: string;
  /** Working directory to search from (default: process.cwd()) */
  cwd?: string;
}

export interface LoadProfileResult {
  /** The loaded and validated profile data */
  profile: unknown;
  /** Path to the loaded profile file */
  path: string;
}

export interface LoadWithExtendsAndOverridesOptions {
  /** Profile name to load (default: "default") */
  name?: string;
  /** Working directory to search from (default: process.cwd()) */
  cwd?: string;
}

export interface LoadWithExtendsAndOverridesResult {
  /** Profile directory path */
  dir: string;
  /** Main profile JSON data */
  json: unknown;
  /** Parent profiles from extends chain */
  parents: unknown[];
  /** Override profiles from overrides chain */
  overrideFiles: unknown[];
}

export interface LoadRulesFromOptions {
  /** Root directory to search for rules (default: process.cwd()) */
  rootDir?: string;
}

export interface Rule {
  id: string;
  [key: string]: unknown;
}

export interface LoadRulesFromResult {
  /** Loaded and validated rules */
  rules: Rule[];
  /** Paths to rule files that were loaded */
  paths: string[];
}

/**
 * Load profile with extends and overrides chain
 * 
 * @param opts - Loading options
 * @returns Promise resolving to the loaded profile with chain
 */
export async function loadWithExtendsAndOverrides(opts: LoadWithExtendsAndOverridesOptions = {}): Promise<LoadWithExtendsAndOverridesResult> {
  const { name = "default", cwd = process.cwd() } = opts;
  const logger = getLogger();

  // Construct profile path: .kb/profiles/{name}/profile.json
  const profilePath = path.join(cwd, ".kb", "profiles", name, "profile.json");

  logger.debug(`Loading profile from: ${profilePath}`);

  // Read JSON file with diagnostics (without validation - that's done in resolver)
  const readResult = await readJsonWithDiagnostics(profilePath);

  if (!readResult.ok) {
    // Check if it's a file not found error
    const fileNotFound = readResult.diagnostics.some(d =>
      d.code === "FILE_READ_FAILED" &&
      d.level !== "info" &&
      typeof d.detail === "string" &&
      d.detail.includes("ENOENT")
    );

    if (fileNotFound) {
      logger.error(`Profile not found: ${profilePath}`);
      throw new ProfileNotFoundError(profilePath);
    }

    // Other read errors
    logger.error(`Failed to read profile file: ${profilePath}`, { diagnostics: readResult.diagnostics });
    throw new ProfileSchemaError(readResult.diagnostics);
  }

  const profileData = readResult.data as any;
  const profileDir = path.dirname(profilePath);
  const parents: unknown[] = [];
  const overrideFiles: unknown[] = [];

  // Load extends chain (left to right)
  if (profileData.extends && Array.isArray(profileData.extends)) {
    for (const extendName of profileData.extends) {
      if (typeof extendName !== 'string') { continue; }

      const extendPath = path.join(profileDir, "..", extendName, "profile.json");
      try {
        const extendResult = await readJsonWithDiagnostics(extendPath);
        if (extendResult.ok) {
          parents.push(extendResult.data);
          logger.debug(`Loaded extends: ${extendName}`);
        }
      } catch (err) {
        logger.warn(`Failed to load extends profile: ${extendName}`, { error: err });
      }
    }
  }

  // Load overrides chain (left to right)
  if (profileData.overrides && Array.isArray(profileData.overrides)) {
    for (const overrideName of profileData.overrides) {
      if (typeof overrideName !== 'string') { continue; }

      const overridePath = path.join(profileDir, "..", overrideName, "profile.json");
      try {
        const overrideResult = await readJsonWithDiagnostics(overridePath);
        if (overrideResult.ok) {
          overrideFiles.push(overrideResult.data);
          logger.debug(`Loaded override: ${overrideName}`);
        }
      } catch (err) {
        logger.warn(`Failed to load override profile: ${overrideName}`, { error: err });
      }
    }
  }

  logger.info(`Successfully loaded profile: ${name} from ${profilePath} with ${parents.length} extends and ${overrideFiles.length} overrides`);

  return {
    dir: profileDir,
    json: profileData,
    parents,
    overrideFiles
  };
}

/**
 * Load a profile from .kb/profiles/{name}/profile.json
 * 
 * @param opts - Loading options
 * @returns Promise resolving to the loaded profile
 * @throws ProfileNotFoundError if profile file doesn't exist
 * @throws ProfileValidationError if profile fails schema validation
 */
export async function loadProfile(opts: LoadProfileOptions = {}): Promise<LoadProfileResult> {
  const { name = "default", cwd = process.cwd() } = opts;
  const logger = getLogger();

  // Construct profile path: .kb/profiles/{name}/profile.json
  const profilePath = path.join(cwd, ".kb", "profiles", name, "profile.json");

  logger.debug(`Loading profile from: ${profilePath}`);

  // Read JSON file with diagnostics
  const readResult = await readJsonWithDiagnostics(profilePath);

  if (!readResult.ok) {
    // Check if it's a file not found error
    const fileNotFound = readResult.diagnostics.some(d =>
      d.code === "FILE_READ_FAILED" &&
      d.level !== "info" &&
      typeof d.detail === "string" &&
      d.detail.includes("ENOENT")
    );

    if (fileNotFound) {
      logger.error(`Profile not found: ${profilePath}`);
      throw new ProfileNotFoundError(profilePath);
    }

    // Other read errors
    logger.error(`Failed to read profile file: ${profilePath}`, { diagnostics: readResult.diagnostics });
    throw new ProfileSchemaError(readResult.diagnostics);
  }

  // Validate the loaded profile
  const validationResult = validateProfile(readResult.data);

  if (!validationResult.ok) {
    logger.error(`Profile validation failed: ${profilePath}`, { errors: validationResult.errors });
    throw new ProfileSchemaError(validationResult.errors);
  }

  logger.info(`Successfully loaded profile: ${name} from ${profilePath}`);

  return {
    profile: readResult.data,
    path: profilePath
  };
}

export async function loadRulesFrom(opts: LoadWithExtendsAndOverridesOptions = {}): Promise<LoadRulesFromResult> {
  const { name = "default", cwd = process.cwd() } = opts;
  const logger = getLogger();

  // Construct rules directory path: .kb/profiles/{name}/rules
  const rulesDir = path.join(cwd, ".kb", "profiles", name, "rules");

  logger.debug(`Loading rules from: ${rulesDir}`);

  try {
    // Check if rules directory exists
    await fs.access(rulesDir);
  } catch {
    logger.debug(`Rules directory not found: ${rulesDir}`);
    return { rules: [], paths: [] };
  }

  // Find all JSON files in rules directory
  const ruleFiles = await glob("**/*.json", {
    cwd: rulesDir,
    absolute: true,
    nodir: true
  });

  const rules: Rule[] = [];
  const paths: string[] = [];
  const seenIds = new Set<string>();

  // Get rules validator
  const rulesValidator = getValidatorById(SCHEMA_ID.rules);

  for (const rulePath of ruleFiles) {
    try {
      // Skip schema files
      if (rulePath.endsWith("schema.json")) {
        continue;
      }

      const readResult = await readJsonWithDiagnostics(rulePath);
      if (!readResult.ok) {
        logger.warn(`Failed to read rule file: ${rulePath}`, { diagnostics: readResult.diagnostics });
        continue;
      }

      // Validate against rules schema
      const isValid = rulesValidator(readResult.data);
      if (!isValid) {
        logger.warn(`Rule validation failed: ${rulePath}`, { errors: rulesValidator.errors });
        continue;
      }

      const ruleData = readResult.data as any;

      // Normalize rule (ensure it has an id)
      if (!ruleData.id || typeof ruleData.id !== 'string') {
        logger.warn(`Rule missing id field: ${rulePath}`);
        continue;
      }

      // De-duplicate by id
      if (seenIds.has(ruleData.id)) {
        logger.debug(`Duplicate rule id skipped: ${ruleData.id} from ${rulePath}`);
        continue;
      }

      seenIds.add(ruleData.id);
      rules.push(ruleData);
      paths.push(rulePath);

      logger.debug(`Loaded rule: ${ruleData.id} from ${rulePath}`);
    } catch (err) {
      logger.warn(`Error processing rule file: ${rulePath}`, { error: err });
    }
  }

  logger.info(`Successfully loaded ${rules.length} rules from ${paths.length} files`);

  return { rules, paths };
}
