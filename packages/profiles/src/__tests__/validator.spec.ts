import { describe, it, expect } from "vitest";
import { validateProfile } from "../validator";

describe("validateProfile", () => {
  it("should validate the example profile from the user", () => {
    // This is the exact example from the user's question
    const profile = {
      name: "default",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    const result = validateProfile(profile);

    expect(result.ok).toBe(true);
    expect(result.errors).toBeNull();
  });

  it("should validate a valid profile", () => {
    const profile = {
      name: "default",
      kind: "composite",
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    const result = validateProfile(profile);

    expect(result.ok).toBe(true);
    expect(result.errors).toBeNull();
  });

  it("should reject invalid profile with missing required fields", () => {
    const invalidProfile = {
      name: "default",
      // missing kind, scope, version
      products: { review: { enabled: true } }
    };

    const result = validateProfile(invalidProfile);

    expect(result.ok).toBe(false);
    expect(result.errors).not.toBeNull();
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("should reject profile with invalid kind", () => {
    const profile = {
      name: "default",
      kind: "invalid-kind", // invalid kind
      scope: "repo",
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    const result = validateProfile(profile);

    expect(result.ok).toBe(false);
    expect(result.errors).not.toBeNull();
  });

  it("should reject profile with invalid scope", () => {
    const profile = {
      name: "default",
      kind: "composite",
      scope: "invalid-scope", // invalid scope
      version: "1.0.0",
      products: { review: { enabled: true } }
    };

    const result = validateProfile(profile);

    expect(result.ok).toBe(false);
    expect(result.errors).not.toBeNull();
  });

  it("should validate profile with different valid kinds", () => {
    const kinds = ["review", "tests", "docs", "assistant", "composite"] as const;

    kinds.forEach(kind => {
      const profile = {
        name: "test",
        kind,
        scope: "repo",
        version: "1.0.0",
        products: { review: { enabled: true } }
      };

      const result = validateProfile(profile);
      expect(result.ok).toBe(true);
    });
  });

  it("should validate profile with different valid scopes", () => {
    const scopes = ["repo", "package", "dir"] as const;

    scopes.forEach(scope => {
      const profile = {
        name: "test",
        kind: "composite",
        scope,
        version: "1.0.0",
        products: { review: { enabled: true } }
      };

      const result = validateProfile(profile);
      expect(result.ok).toBe(true);
    });
  });

  it("should handle complex products configuration", () => {
    const profile = {
      name: "complex",
      kind: "composite",
      scope: "repo",
      version: "2.0.0",
      products: {
        review: {
          enabled: true,
          config: "strict",
          io: {
            allow: ["src/**/*"],
            deny: ["node_modules/**/*"]
          }
        },
        tests: {
          enabled: false
        }
      }
    };

    const result = validateProfile(profile);

    expect(result.ok).toBe(true);
    expect(result.errors).toBeNull();
  });
});
