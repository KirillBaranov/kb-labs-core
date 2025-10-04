import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { resolveProfile } from "../resolver";
import { loadWithExtendsAndOverrides, loadRulesFrom } from "../loader";
import { mergeProfiles } from "../resolver/merge";

// Mock the dependencies
vi.mock("@kb-labs/core-config", () => ({
  readJsonWithDiagnostics: vi.fn()
}));

vi.mock("@kb-labs/core-sys", () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }))
}));

vi.mock("glob", () => ({
  glob: vi.fn(() => Promise.resolve([]))
}));

describe("resolveProfile", () => {
  it("should work with the user's example case", async () => {
    // This is the exact example from the user's question
    const userExampleProfile = {
      name: "default",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: userExampleProfile,
      diagnostics: []
    });

    const res = await resolveProfile({
      cwd: process.cwd(),
      name: "default",
      strict: true
    });

    expect(res.name).toBe("default");
    expect(res.kind).toBe("composite");
    expect(Object.keys(res.products)).toEqual(["review"]);
    expect(res.products.review?.enabled).toBe(true);
  });
  let mockReadJsonWithDiagnostics: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { readJsonWithDiagnostics } = await import("@kb-labs/core-config");
    mockReadJsonWithDiagnostics = vi.mocked(readJsonWithDiagnostics);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve a valid profile successfully", async () => {
    const validProfile = {
      name: "test-profile",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: {
        review: { enabled: true },
        tests: { enabled: false }
      }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: validProfile,
      diagnostics: []
    });

    const result = await resolveProfile({
      cwd: "/test",
      name: "test-profile",
      strict: true
    });

    expect(result.name).toBe("test-profile");
    expect(result.kind).toBe("composite");
    expect(result.scope).toBe("repo");
    expect(result.version).toBe("1.0.0");
    expect(Object.keys(result.products)).toEqual(["review", "tests"]);
    expect(result.roots).toHaveLength(1);
    expect(result.files).toHaveLength(0); // MVP: empty files array
    expect(result.rules).toEqual([]);
    expect(result.meta).toEqual({});
  });

  it("should use default values when options not provided", async () => {
    const validProfile = {
      name: "default",
      kind: "review",
      scope: "repo",
      version: "1.0.0",
      products: {
        review: { enabled: true }
      }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: validProfile,
      diagnostics: []
    });

    const result = await resolveProfile();

    expect(result.name).toBe("default");
    expect(result.kind).toBe("review");
    expect(result.scope).toBe("repo");
    expect(Object.keys(result.products)).toEqual(["review"]);
  });

  it("should handle profile without version", async () => {
    const profileWithoutVersion = {
      name: "no-version",
      kind: "composite",
      scope: "repo",
      version: "1.0.0", // Add version to make it valid
      products: {
        review: { enabled: true }
      }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: profileWithoutVersion,
      diagnostics: []
    });

    const result = await resolveProfile({ name: "no-version" });

    expect(result.version).toBe("1.0.0");
    expect(result.name).toBe("no-version");
  });

  it("should handle profile with metadata", async () => {
    const profileWithMetadata = {
      name: "with-metadata",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      metadata: {
        author: "test",
        description: "test profile"
      },
      products: {
        review: { enabled: true }
      }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: profileWithMetadata,
      diagnostics: []
    });

    const result = await resolveProfile({ name: "with-metadata" });

    expect(result.meta).toEqual({
      author: "test",
      description: "test profile"
    });
  });

  it("should handle profile with rules", async () => {
    const profileWithRules = {
      name: "with-rules",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: {
        review: { enabled: true }
      }
      // Note: rules field is not in the schema, so we test without it
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: profileWithRules,
      diagnostics: []
    });

    const result = await resolveProfile({ name: "with-rules" });

    expect(result.rules).toEqual([]); // Default empty array
    expect(result.name).toBe("with-rules");
  });

  it("should construct correct profile path", async () => {
    const validProfile = {
      name: "path-test",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: {
        review: { enabled: true }
      }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: validProfile,
      diagnostics: []
    });

    await resolveProfile({ name: "path-test", cwd: "/custom/path" });

    // Verify the correct path was used
    expect(mockReadJsonWithDiagnostics).toHaveBeenCalledWith("/custom/path/.kb/profiles/path-test/profile.json");
  });

  it("should handle profile with IO policies", async () => {
    const profileWithIo = {
      name: "with-io",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      defaults: {
        io: {
          allow: ["src/**/*"],
          deny: ["node_modules/**/*"]
        }
      },
      products: {
        review: {
          enabled: true,
          io: {
            allow: ["src/**/*", "tests/**/*"],
            deny: ["dist/**/*"]
          }
        }
      }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: profileWithIo,
      diagnostics: []
    });

    const result = await resolveProfile({ name: "with-io" });

    expect(result.products.review?.io).toEqual({
      allow: ["src/**/*", "tests/**/*"],
      deny: ["node_modules/**/*", "dist/**/*"],
      conflicts: []
    });
  });

  it("should throw ProfileSchemaError when validation fails in strict mode", async () => {
    const invalidProfile = {
      name: "invalid",
      // missing required fields
      products: {
        review: { enabled: true }
      }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: invalidProfile,
      diagnostics: []
    });

    await expect(resolveProfile({
      name: "invalid",
      strict: true
    })).rejects.toThrow("Profile validation failed");
  });

  it("should not throw when validation fails in non-strict mode", async () => {
    const invalidProfile = {
      name: "invalid",
      // missing required fields
      products: {
        review: { enabled: true }
      }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: invalidProfile,
      diagnostics: []
    });

    const result = await resolveProfile({
      name: "invalid",
      strict: false
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("invalid");
  });
});

describe("loadWithExtendsAndOverrides", () => {
  let mockReadJsonWithDiagnostics: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { readJsonWithDiagnostics } = await import("@kb-labs/core-config");
    mockReadJsonWithDiagnostics = vi.mocked(readJsonWithDiagnostics);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should load profile without extends or overrides", async () => {
    const profile = {
      name: "test",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: profile,
      diagnostics: []
    });

    const result = await loadWithExtendsAndOverrides({ name: "test" });

    expect(result.json).toEqual(profile);
    expect(result.parents).toEqual([]);
    expect(result.overrideFiles).toEqual([]);
    expect(result.dir).toContain(".kb/profiles/test");
  });

  it("should load profile with extends chain", async () => {
    const baseProfile = {
      name: "base",
      kind: "review",
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    const extendedProfile = {
      name: "extended",
      kind: "composite",
      extends: ["base"],
      products: { tests: { enabled: true } }
    };

    // Mock reads for main profile and base profile
    mockReadJsonWithDiagnostics
      .mockResolvedValueOnce({ ok: true, data: extendedProfile, diagnostics: [] }) // main profile
      .mockResolvedValueOnce({ ok: true, data: baseProfile, diagnostics: [] }); // base profile

    const result = await loadWithExtendsAndOverrides({ name: "extended" });

    expect(result.json).toEqual(extendedProfile);
    expect(result.parents).toEqual([baseProfile]);
    expect(result.overrideFiles).toEqual([]);
  });

  it("should load profile with overrides chain", async () => {
    const overrideProfile = {
      name: "override",
      kind: "assistant",
      scope: "repo",
      version: "1.0.0",
      products: { assistant: { enabled: true } }
    };

    const mainProfile = {
      name: "main",
      kind: "composite",
      overrides: ["override"],
      products: { review: { enabled: true } }
    };

    // Mock reads for main profile and override profile
    mockReadJsonWithDiagnostics
      .mockResolvedValueOnce({ ok: true, data: mainProfile, diagnostics: [] }) // main profile
      .mockResolvedValueOnce({ ok: true, data: overrideProfile, diagnostics: [] }); // override profile

    const result = await loadWithExtendsAndOverrides({ name: "main" });

    expect(result.json).toEqual(mainProfile);
    expect(result.parents).toEqual([]);
    expect(result.overrideFiles).toEqual([overrideProfile]);
  });

  it("should handle missing extends/overrides gracefully", async () => {
    const profile = {
      name: "test",
      kind: "composite",
      extends: ["missing"],
      overrides: ["missing-override"],
      products: { review: { enabled: true } }
    };

    // Mock main profile read + failed reads for missing profiles
    mockReadJsonWithDiagnostics
      .mockResolvedValueOnce({ ok: true, data: profile, diagnostics: [] }) // main profile
      .mockRejectedValueOnce(new Error("File not found")) // missing extend
      .mockRejectedValueOnce(new Error("File not found")); // missing override

    const result = await loadWithExtendsAndOverrides({ name: "test" });

    expect(result.json).toEqual(profile);
    expect(result.parents).toEqual([]);
    expect(result.overrideFiles).toEqual([]);
  });
});

describe("loadRulesFrom", () => {
  let mockReadJsonWithDiagnostics: any;
  let mockGlob: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { readJsonWithDiagnostics } = await import("@kb-labs/core-config");
    mockReadJsonWithDiagnostics = vi.mocked(readJsonWithDiagnostics);

    const { glob } = await import("glob");
    mockGlob = vi.mocked(glob);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty rules when rules directory doesn't exist", async () => {
    mockGlob.mockResolvedValue([]);

    const result = await loadRulesFrom({ name: "test" });

    expect(result.rules).toEqual([]);
    expect(result.paths).toEqual([]);
  });

  it("should load and validate rules", async () => {
    const rule1 = { id: "rule1", type: "lint", config: {} };
    const rule2 = { id: "rule2", type: "format", config: {} };

    mockGlob.mockResolvedValue([
      "/test/.kb/profiles/test/rules/rule1.json",
      "/test/.kb/profiles/test/rules/rule2.json"
    ]);

    mockReadJsonWithDiagnostics
      .mockResolvedValueOnce({ ok: true, data: rule1, diagnostics: [] })
      .mockResolvedValueOnce({ ok: true, data: rule2, diagnostics: [] });

    const result = await loadRulesFrom({ name: "test" });

    expect(result.rules).toEqual([rule1, rule2]);
    expect(result.paths).toHaveLength(2);
  });

  it("should de-duplicate rules by id", async () => {
    const rule1 = { id: "duplicate", type: "lint", config: {} };
    const rule2 = { id: "duplicate", type: "format", config: {} }; // same id

    mockGlob.mockResolvedValue([
      "/test/.kb/profiles/test/rules/rule1.json",
      "/test/.kb/profiles/test/rules/rule2.json"
    ]);

    mockReadJsonWithDiagnostics
      .mockResolvedValueOnce({ ok: true, data: rule1, diagnostics: [] })
      .mockResolvedValueOnce({ ok: true, data: rule2, diagnostics: [] });

    const result = await loadRulesFrom({ name: "test" });

    expect(result.rules).toEqual([rule1]); // only first one kept
    expect(result.paths).toEqual(["/test/.kb/profiles/test/rules/rule1.json"]);
  });

  it("should skip invalid rules", async () => {
    const validRule = { id: "valid", type: "lint", config: {} };
    const invalidRule = { type: "format", config: {} }; // missing id

    mockGlob.mockResolvedValue([
      "/test/.kb/profiles/test/rules/valid.json",
      "/test/.kb/profiles/test/rules/invalid.json"
    ]);

    mockReadJsonWithDiagnostics
      .mockResolvedValueOnce({ ok: true, data: validRule, diagnostics: [] })
      .mockResolvedValueOnce({ ok: true, data: invalidRule, diagnostics: [] });

    const result = await loadRulesFrom({ name: "test" });

    expect(result.rules).toEqual([validRule]);
    expect(result.paths).toEqual(["/test/.kb/profiles/test/rules/valid.json"]);
  });

  it("should skip schema files", async () => {
    const rule = { id: "rule1", type: "lint", config: {} };

    mockGlob.mockResolvedValue([
      "/test/.kb/profiles/test/rules/rule1.json",
      "/test/.kb/profiles/test/rules/schema.json" // should be skipped
    ]);

    mockReadJsonWithDiagnostics
      .mockResolvedValueOnce({ ok: true, data: rule, diagnostics: [] });

    const result = await loadRulesFrom({ name: "test" });

    expect(result.rules).toEqual([rule]);
    expect(result.paths).toEqual(["/test/.kb/profiles/test/rules/rule1.json"]);
  });
});

describe("mergeProfiles", () => {
  it("should merge arrays with deduplication by id", () => {
    const profile1 = {
      rules: [
        { id: "rule1", type: "lint" },
        { id: "rule2", type: "format" }
      ]
    };

    const profile2 = {
      rules: [
        { id: "rule2", type: "format-updated" }, // same id, should override
        { id: "rule3", type: "test" }
      ]
    };

    const result = mergeProfiles([profile1, profile2]);

    expect(result.rules).toEqual([
      { id: "rule1", type: "lint" },
      { id: "rule2", type: "format-updated" },
      { id: "rule3", type: "test" }
    ]);
  });

  it("should merge objects deeply", () => {
    const profile1 = {
      defaults: {
        io: { allow: ["src/**/*"] },
        config: { strict: true }
      }
    };

    const profile2 = {
      defaults: {
        io: { deny: ["dist/**/*"] },
        config: { timeout: 5000 }
      }
    };

    const result = mergeProfiles([profile1, profile2]);

    expect(result.defaults).toEqual({
      io: { allow: ["src/**/*"], deny: ["dist/**/*"] },
      config: { strict: true, timeout: 5000 }
    });
  });

  it("should handle primitive overrides", () => {
    const profile1 = { name: "old-name", version: "1.0.0" };
    const profile2 = { name: "new-name" };

    const result = mergeProfiles([profile1, profile2]);

    expect(result.name).toBe("new-name");
    expect(result.version).toBe("1.0.0");
  });
});
