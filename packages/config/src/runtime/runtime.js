/**
 * @module @kb-labs/core/config/runtime
 * Infrastructure-only config pipeline (no domain keys).
 * Provides: nearest config discovery, safe JSON read with diagnostics,
 * deep merge that ignores `undefined`, and a generic resolver (defaults→file→env→cli).
 */
import { promises as fsp } from "node:fs";
import path from "node:path";
/** Find nearest config file walking up from startDir until stopDir or FS root. */
export async function findNearestConfig(opts) {
    const start = path.resolve(opts.startDir ?? process.cwd());
    const stop = opts.stopDir ? path.resolve(opts.stopDir) : null;
    const tried = [];
    let dir = start;
    while (true) {
        for (const name of opts.filenames) {
            const candidate = path.join(dir, name);
            tried.push(candidate);
            try {
                await fsp.access(candidate);
                return { path: candidate, tried };
            }
            catch { /* continue */ }
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            break;
        }
        if (stop && (dir === stop || parent === stop)) {
            break;
        }
        dir = parent;
    }
    return { path: null, tried };
}
/** Read JSON with explicit diagnostics (no silent nulls). */
export async function readJsonWithDiagnostics(p) {
    const diagnostics = [];
    try {
        const raw = await fsp.readFile(p, "utf8");
        try {
            const data = JSON.parse(raw);
            return { ok: true, data, diagnostics };
        }
        catch (e) {
            diagnostics.push({ level: "error", code: "JSON_PARSE_FAILED", message: `Failed to parse JSON: ${p}`, detail: String(e) });
            return { ok: false, diagnostics };
        }
    }
    catch (e) {
        diagnostics.push({ level: "error", code: "FILE_READ_FAILED", message: `Failed to read file: ${p}`, detail: String(e) });
        return { ok: false, diagnostics };
    }
}
/** Shallow pick of defined fields only. */
export function pickDefined(obj) {
    if (!obj) {
        return {};
    }
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) {
            out[k] = v;
        }
    }
    return out;
}
/** Deep merge (objects/arrays), ignoring `undefined` on the overlay. */
export function mergeDefined(base, over) {
    if (!over) {
        return base;
    }
    if (Array.isArray(base) && Array.isArray(over)) {
        return [...base, ...over.filter(v => v !== undefined)];
    }
    if (isPlainObject(base) && isPlainObject(over)) {
        const out = { ...base };
        for (const [k, v] of Object.entries(over)) {
            if (v === undefined) {
                continue;
            }
            if (isPlainObject(base[k]) && isPlainObject(v)) {
                out[k] = mergeDefined(base[k], v);
            }
            else if (Array.isArray(base[k]) && Array.isArray(v)) {
                out[k] = mergeDefined(base[k], v);
            }
            else {
                out[k] = v;
            }
        }
        return out;
    }
    // Different types → overlay wins if defined
    return over ?? base;
}
function isPlainObject(v) {
    return typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype;
}
const SYSTEM_DEFAULTS = {
    profiles: { rootDir: '.kb/profiles', defaultName: 'default', strict: true }
};
/**
 * Generic resolver: defaults → fileConfig → envMapper(process.env) → cliOverrides.
 * No domain keys inside; mapping/validation provided by the product/shared layer.
 */
export function resolveConfig(args) {
    const diagnostics = [];
    const envPart = args.envMapper?.(process.env) ?? {};
    const merged = mergeDefined(mergeDefined(mergeDefined(mergeDefined(structuredClone(SYSTEM_DEFAULTS), structuredClone(args.defaults)), args.fileConfig), envPart), args.cliOverrides);
    if (args.validate) {
        const res = args.validate(merged);
        if (!res.ok) {
            diagnostics.push({ level: "error", code: "CONFIG_VALIDATION_FAILED", message: "Configuration did not pass validation." });
            if (res.diagnostics) {
                diagnostics.push(...res.diagnostics);
            }
        }
        else if (res.diagnostics?.length) {
            diagnostics.push(...res.diagnostics);
        }
    }
    return { value: merged, diagnostics };
}
export { SYSTEM_DEFAULTS };
//# sourceMappingURL=runtime.js.map