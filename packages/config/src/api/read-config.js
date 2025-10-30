/**
 * @module @kb-labs/core/config/api/read-config
 * Enhanced config file reading with YAML support and find-up
 */
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { extname } from 'node:path';
import YAML from 'yaml';
import { KbError, ERROR_HINTS } from '../errors/kb-error';
import { fsCache } from '../cache/fs-cache';
/**
 * Read config file with format detection and caching
 */
export async function readConfigFile(filePath) {
    const absPath = path.resolve(filePath);
    // Check cache first
    const cached = await fsCache.get(absPath);
    if (cached !== null) {
        return cached;
    }
    try {
        const raw = await fsp.readFile(absPath, 'utf-8');
        const ext = extname(absPath).toLowerCase();
        let data;
        let format;
        if (ext === '.yaml' || ext === '.yml') {
            data = YAML.parse(raw);
            format = 'yaml';
        }
        else {
            data = JSON.parse(raw);
            format = 'json';
        }
        const result = { data, format, path: absPath };
        // Cache the result
        await fsCache.set(absPath, result);
        return result;
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            throw new KbError('ERR_CONFIG_INVALID', `Failed to parse config file: ${filePath}`, ERROR_HINTS.ERR_CONFIG_INVALID, { filePath, error: error.message });
        }
        throw new KbError('ERR_CONFIG_NOT_FOUND', `Config file not found: ${filePath}`, ERROR_HINTS.ERR_CONFIG_NOT_FOUND, { filePath, error: error instanceof Error ? error.message : String(error) });
    }
}
/**
 * Find nearest config file walking up from startDir to git root
 */
async function findNearestConfig(startDir, filenames = ['kb-labs.config.json', 'kb-labs.config.yaml', 'kb-labs.config.yml']) {
    const start = path.resolve(startDir);
    const tried = [];
    let dir = start;
    while (true) {
        for (const filename of filenames) {
            const candidate = path.join(dir, filename);
            tried.push(candidate);
            try {
                await fsp.access(candidate);
                return { path: candidate, tried };
            }
            catch {
                // Continue to next filename
            }
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            // Reached filesystem root
            break;
        }
        dir = parent;
    }
    return { path: null, tried };
}
/**
 * Find git root directory
 */
export async function findGitRoot(startDir) {
    let dir = path.resolve(startDir);
    while (true) {
        try {
            await fsp.access(path.join(dir, '.git'));
            return dir;
        }
        catch {
            const parent = path.dirname(dir);
            if (parent === dir) {
                break;
            }
            dir = parent;
        }
    }
    return null;
}
/**
 * Read workspace config with find-up to git root
 */
export async function readWorkspaceConfig(cwd) {
    const filenames = ['kb-labs.config.json', 'kb-labs.config.yaml', 'kb-labs.config.yml'];
    const { path: configPath } = await findNearestConfig(cwd, filenames);
    if (!configPath) {
        return null;
    }
    return readConfigFile(configPath);
}
//# sourceMappingURL=read-config.js.map