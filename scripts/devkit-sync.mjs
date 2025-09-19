#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DEVKIT_ROOT = resolve(ROOT, "node_modules/@kb-labs/devkit");

// ── Опциональный проектный конфиг: kb-labs.config.json
async function loadProjectConfig() {
  const p = resolve(ROOT, "kb-labs.config.json");
  try { return JSON.parse(await readFile(p, "utf8")); } catch { return {}; }
}
const PROJECT_CFG = await loadProjectConfig();

// ── Карта синка: что и куда копируем
const MAP = {
  agents: {
    from: resolve(DEVKIT_ROOT, "agents"),
    to: resolve(ROOT, "kb-labs/agents"),
    recursive: true,
    type: "dir",
  },
  cursorrules: {
    from: resolve(DEVKIT_ROOT, ".cursorrules"),
    to: resolve(ROOT, ".cursorrules"),          // Cursor ожидает в корне
    recursive: false,
    type: "file",
  },
  vscode: {
    from: resolve(DEVKIT_ROOT, ".vscode/settings.json"),
    to: resolve(ROOT, ".vscode/settings.json"),  // редакторные дефолты
    recursive: false,
    type: "file",
  },
};

// Разрешаем отключать цели синка через kb-labs.config.json
const disabled = new Set(PROJECT_CFG?.sync?.disabled ?? []);

// ── Аргументы
const args = new Set(process.argv.slice(2));
const force = args.has("--force") || !!PROJECT_CFG?.sync?.force;
const check = args.has("--check");
const verbose = args.has("--verbose");
const only = [...args].filter(a => MAP[a]);

const allTargets = Object.keys(MAP).filter(k => !disabled.has(k));
const targets = only.length ? only.filter(k => !disabled.has(k)) : allTargets;

const log = (...a) => console.log("[devkit-sync]", ...a);
const warn = (...a) => console.warn("[devkit-sync]", ...a);

async function exists(p) { try { await stat(p); return true; } catch { return false; } }
async function ensureDirForFile(p) { await mkdir(dirname(p), { recursive: true }); }

async function readDevkitMeta() {
  const pkgPath = resolve(DEVKIT_ROOT, "package.json");
  if (!(await exists(pkgPath))) {return null;}
  try {
    const json = JSON.parse(await readFile(pkgPath, "utf8"));
    return { name: json.name, version: json.version ?? null, description: json.description ?? null };
  } catch { return null; }
}

async function sha256File(p) {
  const buf = await readFile(p);
  return createHash("sha256").update(buf).digest("hex");
}

async function listFilesRec(root) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {await walk(p);}
      else {out.push(p);}
    }
  }
  await walk(root);
  return out;
}

async function comparePaths(src, dst, type) {
  const diffs = [];
  const onlySrc = [];
  const onlyDst = [];

  if (type === "file") {
    const srcOk = await exists(src);
    const dstOk = await exists(dst);
    if (!srcOk && !dstOk) {return { diffs, onlySrc, onlyDst };}
    if (srcOk && !dstOk) { onlySrc.push(dst); return { diffs, onlySrc, onlyDst }; }
    if (!srcOk && dstOk) { onlyDst.push(dst); return { diffs, onlySrc, onlyDst }; }
    const [a, b] = await Promise.all([sha256File(src), sha256File(dst)]);
    if (a !== b) {diffs.push(dst);}
    return { diffs, onlySrc, onlyDst };
  }

  const srcOk = await exists(src);
  const dstOk = await exists(dst);
  if (!srcOk && !dstOk) {return { diffs, onlySrc, onlyDst };}
  if (srcOk && !dstOk) {
    const files = await listFilesRec(src);
    onlySrc.push(...files.map(f => f.replace(src, dst)));
    return { diffs, onlySrc, onlyDst };
  }
  if (!srcOk && dstOk) {
    const files = await listFilesRec(dst);
    onlyDst.push(...files);
    return { diffs, onlySrc, onlyDst };
  }

  const srcFiles = await listFilesRec(src);
  const dstFiles = await listFilesRec(dst);
  const srcRel = new Map(srcFiles.map(p => [p.slice(src.length + 1), p]));
  const dstRel = new Map(dstFiles.map(p => [p.slice(dst.length + 1), p]));

  for (const [rel, pSrc] of srcRel) {
    const pDst = dstRel.get(rel);
    if (!pDst) { onlySrc.push(join(dst, rel)); continue; }
    const [a, b] = await Promise.all([sha256File(pSrc), sha256File(pDst)]);
    if (a !== b) {diffs.push(pDst);}
  }
  for (const [rel, pDst] of dstRel) {
    if (!srcRel.has(rel)) {onlyDst.push(pDst);}
  }
  return { diffs, onlySrc, onlyDst };
}

async function copyOne(key) {
  const { from, to, recursive, type } = MAP[key];
  const srcOk = await exists(from);
  if (!srcOk) { warn(`skip ${key} — source not found: ${from}`); return { key, status: "skip" }; }

  if (check) {
    const { diffs, onlySrc, onlyDst } = await comparePaths(from, to, type);
    const changed = diffs.length + onlySrc.length + onlyDst.length > 0;
    if (changed) {
      log(`drift ${key}:`, JSON.stringify({ diffs, onlySrc, onlyDst }, null, 2));
      return { key, status: "drift", diffs, onlySrc, onlyDst };
    } else {
      if (verbose) {log(`ok ${key}: no drift`);}
      return { key, status: "ok" };
    }
  }

  const dstOk = await exists(to);
  if (dstOk && !force) {
    if (verbose) {log(`keep ${key} — exists: ${to}`);}
    return { key, status: "keep" };
  }

  await ensureDirForFile(type === "file" ? to : join(to, ".__ensure__"));
  await cp(from, to, { recursive, force: true });
  log(`synced ${key} -> ${to}`);
  return { key, status: "sync" };
}

async function writeProvenance(meta) {
  const out = {
    source: meta?.name ?? "@kb-labs/devkit",
    version: meta?.version ?? null,
    when: new Date().toISOString(),
    items: targets,
  };
  await mkdir(resolve(ROOT, "kb-labs"), { recursive: true });
  await writeFile(resolve(ROOT, "kb-labs/DEVKIT_SYNC.json"), JSON.stringify(out, null, 2));
  if (verbose) {log("wrote kb-labs/DEVKIT_SYNC.json");}
}

(async () => {
  const meta = await readDevkitMeta();
  const results = [];
  for (const k of targets) {results.push(await copyOne(k));}

  const summary = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
  if (!check) {await writeProvenance(meta);}

  log(check ? "check done" : "sync done", summary, `(force=${force})`);
  if (check && (summary.drift || summary["onlySrc"] || summary["onlyDst"])) {process.exit(2);}
  process.exit(0);
})();