import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { resolveProfile } from "../resolver";

describe("User Example Integration Test", () => {
  it("should work with the user's exact example", async () => {
    // Create a temporary profile file for this test
    const testDir = "/tmp/kb-labs-test";
    const profileDir = path.join(testDir, ".kb", "profiles", "default");
    const profilePath = path.join(profileDir, "profile.json");

    try {
      // Ensure directory exists
      await fsp.mkdir(profileDir, { recursive: true });

      // Write the profile file
      const profileData = {
        name: "default",
        kind: "composite",
        scope: "repo",
        version: "1.0.0",
        products: { review: { enabled: true } }
      };

      await fsp.writeFile(profilePath, JSON.stringify(profileData, null, 2));

      // Test the user's exact code
      const res = await resolveProfile({
        cwd: testDir,
        name: "default",
        strict: true
      });

      // Verify the results
      expect(res.name).toBe("default");
      expect(res.kind).toBe("composite");
      expect(Object.keys(res.products)).toEqual(["review"]);
      expect(res.products.review.enabled).toBe(true);

      console.log("✅ User example works!");
      console.log("Profile name:", res.name);
      console.log("Profile kind:", res.kind);
      console.log("Product keys:", Object.keys(res.products));

    } finally {
      // Clean up
      try {
        await fsp.rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });
});
