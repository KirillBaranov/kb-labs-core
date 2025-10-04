export const SCHEMA_ID = {
  profile: "https://schemas.kb-labs.dev/profile/profile.schema.json",
  io: "https://schemas.kb-labs.dev/profile/profile.io.json",
  diff: "https://schemas.kb-labs.dev/profile/profile.diff.json",
  cap: "https://schemas.kb-labs.dev/profile/profile.cap.json",
  rules: "https://schemas.kb-labs.dev/profile/rules.schema.json",
} as const;

export const DEFAULTS = {
  profilesDir: ".kb/profiles",
  cacheDir: ".kb/.cache",
} as const;

// Legacy export for backward compatibility
export const PROFILE_DIR = DEFAULTS.profilesDir;