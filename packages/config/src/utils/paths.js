import path from 'node:path';
/**
 * Get profiles root directory
 */
export function getProfilesRootDir(cwd) {
    return path.join(cwd, '.kb', 'profiles');
}
/**
 * Get product configuration directory
 */
export function getProductConfigDir(cwd, fsProduct) {
    return path.join(cwd, '.kb', fsProduct);
}
/**
 * Get product configuration file path
 */
export function getProductConfigPath(cwd, fsProduct) {
    return path.join(getProductConfigDir(cwd, fsProduct), `${fsProduct}.config.json`);
}
/**
 * Get .kb root directory
 */
export function getKbRootDir(cwd) {
    return path.join(cwd, '.kb');
}
/**
 * Get lockfile path
 */
export function getLockfilePath(cwd) {
    return path.join(getKbRootDir(cwd), 'lock.json');
}
//# sourceMappingURL=paths.js.map