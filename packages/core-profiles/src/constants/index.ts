export const SCHEMA_ID = {
  profile: "https://schemas.kb-labs.dev/profile/profile.schema.json",
  profileManifestV1: "https://schemas.kb-labs.dev/profile/profile-manifest-v1.schema.json",
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

// Artifact limits
export const MAX_ARTIFACT_SIZE = 1 * 1024 * 1024; // 1MB
export const MAX_FILES_PER_KEY = 100;

// Allowed artifact extensions
export const ALLOWED_EXTENSIONS = ['yml', 'yaml', 'md', 'txt', 'json'];

// Profile templates
export const PROFILE_TEMPLATE_NODE_TS_LIB = {
  schemaVersion: '1.0',
  name: 'node-ts-lib',
  version: '0.1.0',
  extends: [],
  exports: {
    'ai-review': {
      rules: 'artifacts/ai-review/rules.yml',
      prompts: 'artifacts/ai-review/prompts/**',
    },
  },
  defaults: {
    'ai-review': { $ref: './defaults/ai-review.json' },
  },
};

export const DEFAULT_AI_REVIEW_CONFIG = {
  include: ['src/**', 'packages/*/src/**'],
  exclude: ['**/*.test.*', '**/*.spec.*', 'dist/**', 'node_modules/**'],
  providers: { llm: 'openai:gpt-4o' },
  output: { format: 'markdown', dir: '.kb/ai-review/artifacts' },
};

export const DEFAULT_AI_REVIEW_RULES = `version: 1
rules:
  - id: no-console
    level: warn
    message: "Avoid console.log in library code"
    when: { path: "**/*.ts" }
`;

export const DEFAULT_AI_REVIEW_PROMPT = `# Code Review Prompt

Review the following code for:
- Code quality and maintainability
- Potential bugs or issues
- Best practices adherence
- Performance considerations

Provide constructive feedback with specific suggestions.
`;