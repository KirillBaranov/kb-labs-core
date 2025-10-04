// Public API for profiles package
export { loadProfile } from "./api/load-profile";
export { validateProfile } from "./api/validate-profile";
export { mergeProfiles } from "./api/merge-profiles";
export { resolveProfile } from "./api/resolve-profile";
export { ProfileService } from "./api/profile-service";

// Types
export type {
  RawProfile,
  ResolvedProfile,
  ResolveOptions
} from "./types";

// Error classes
export {
  ProfileNotFoundError,
  ExtendResolutionError,
  SchemaValidationError
} from "./errors";

// Factory
export * from "./factory";