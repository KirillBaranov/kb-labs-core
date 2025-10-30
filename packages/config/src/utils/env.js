/**
 * @module @kb-labs/core/utils/env
 * Small helpers to convert ENV strings to typed values.
 */
export function toBool(v) {
    if (v === undefined) {
        return undefined;
    }
    const s = v.trim().toLowerCase();
    if (s === "1" || s === "true" || s === "yes" || s === "on") {
        return true;
    }
    if (s === "0" || s === "false" || s === "no" || s === "off") {
        return false;
    }
    return undefined; // unknown → let caller decide default
}
export function toInt(v) {
    if (v === undefined) {
        return undefined;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
//# sourceMappingURL=env.js.map