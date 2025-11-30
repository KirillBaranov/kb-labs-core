import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PROFILE_DIR } from "../constants";

export type ScaffoldOptions = {
  cwd?: string;
  name: string;
  scope?: "repo" | "package" | "dir";
  dryRun?: boolean;
};

export type ScaffoldPlanItem = { path: string; kind: "dir" | "file"; content?: string };
export type ScaffoldPlan = { items: ScaffoldPlanItem[]; apply: () => Promise<void> };

export async function scaffoldProfile(opts: ScaffoldOptions): Promise<ScaffoldPlan> {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const root = resolve(cwd, PROFILE_DIR, opts.name);
  const items: ScaffoldPlanItem[] = [
    { path: resolve(root, "rules"), kind: "dir" },
    { path: resolve(root, "adr"), kind: "dir" },
    { path: resolve(root, "docs"), kind: "dir" },
    { path: resolve(root, "prompts"), kind: "dir" },
    {
      path: resolve(root, "profile.json"),
      kind: "file",
      content: JSON.stringify({
        "$schema": "https://schemas.kb-labs.dev/profile/profile.schema.json",
        "name": opts.name,
        "kind": "composite",
        "scope": opts.scope ?? "repo",
        "version": "1.0.0",
        "products": { "review": { "enabled": true } }
      }, null, 2)
    }
  ];

  async function apply() {
    if (opts.dryRun) { return; }
    for (const i of items) {
      if (i.kind === "dir") { await mkdir(i.path, { recursive: true }); }
      else { await writeFile(i.path, i.content ?? "", "utf8"); }
    }
  }

  return { items, apply };
}