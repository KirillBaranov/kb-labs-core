import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";
import { loadProfile } from "../loader";
import { ProfileNotFoundError, ProfileSchemaError } from "../errors";

// Mock the dependencies
vi.mock("@kb-labs/core-config", () => ({
  readJsonWithDiagnostics: vi.fn()
}));

vi.mock("@kb-labs/core-sys", () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }))
}));

describe("loadProfile", () => {
  let mockReadJsonWithDiagnostics: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { readJsonWithDiagnostics } = await import("@kb-labs/core-config");
    mockReadJsonWithDiagnostics = vi.mocked(readJsonWithDiagnostics);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should load a valid profile successfully", async () => {
    const validProfile = {
      name: "test",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: validProfile,
      diagnostics: []
    });

    const result = await loadProfile({ name: "test", cwd: "/test" });

    expect(result.profile).toEqual(validProfile);
    expect(result.path).toBe("/test/.kb/profiles/test/profile.json");
    expect(mockReadJsonWithDiagnostics).toHaveBeenCalledWith("/test/.kb/profiles/test/profile.json");
  });

  it("should use default name and cwd when not provided", async () => {
    const validProfile = {
      name: "default",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: validProfile,
      diagnostics: []
    });

    const result = await loadProfile();

    expect(result.profile).toEqual(validProfile);
    expect(result.path).toBe(path.join(process.cwd(), ".kb", "profiles", "default", "profile.json"));
  });

  it("should throw ProfileNotFoundError when file doesn't exist", async () => {
    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: false,
      diagnostics: [
        {
          level: "error",
          code: "FILE_READ_FAILED",
          message: "Failed to read file",
          detail: "Error: ENOENT: no such file or directory"
        }
      ]
    });

    await expect(loadProfile({ name: "nonexistent" })).rejects.toThrow(ProfileNotFoundError);
  });

  it("should throw ProfileSchemaError when JSON parsing fails", async () => {
    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: false,
      diagnostics: [
        {
          level: "error",
          code: "JSON_PARSE_FAILED",
          message: "Failed to parse JSON",
          detail: "Unexpected token"
        }
      ]
    });

    await expect(loadProfile({ name: "invalid-json" })).rejects.toThrow(ProfileSchemaError);
  });

  it("should throw ProfileSchemaError when profile schema validation fails", async () => {
    const invalidProfile = {
      name: "test",
      // missing required fields
      products: { review: { enabled: true } }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: invalidProfile,
      diagnostics: []
    });

    await expect(loadProfile({ name: "invalid-schema" })).rejects.toThrow(ProfileSchemaError);
  });

  it("should throw ProfileSchemaError for other read errors", async () => {
    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: false,
      diagnostics: [
        {
          level: "error",
          code: "FILE_READ_FAILED",
          message: "Failed to read file",
          detail: "Permission denied"
        }
      ]
    });

    await expect(loadProfile({ name: "permission-error" })).rejects.toThrow(ProfileSchemaError);
  });

  it("should construct correct profile path", async () => {
    const validProfile = {
      name: "custom",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    mockReadJsonWithDiagnostics.mockResolvedValue({
      ok: true,
      data: validProfile,
      diagnostics: []
    });

    await loadProfile({ name: "custom", cwd: "/custom/path" });

    expect(mockReadJsonWithDiagnostics).toHaveBeenCalledWith("/custom/path/.kb/profiles/custom/profile.json");
  });
});
