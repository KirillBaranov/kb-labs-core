// Public API for profiles package
export { loadProfile } from "./api/load-profile";
export { validateProfile } from "./api/validate-profile";
export { mergeProfiles } from "./api/merge-profiles";
export { resolveProfile } from "./api/resolve-profile";
export { ProfileService } from "./api/profile-service";

// Enhanced profiles API
export { normalizeManifest, extractProfileInfo } from "./manifest/normalize";
export { listArtifacts } from "./artifacts/list";
export { readArtifact, readArtifactText, readArtifactJson, readArtifactYaml, verifyArtifactSha256 } from "./artifacts/read";
export { materializeArtifacts, getMaterializationManifest, clearMaterializedArtifacts, needsMaterialization } from "./artifacts/materialize";
export { getProductDefaults, resolveDefaultsRef } from "./defaults/product-defaults";
export { resolveExtends, mergeProfileExports, mergeProfileDefaults, validateExtends } from "./resolver/extends-resolver";
export { clearCaches } from "./cache/artifact-cache";

// Types
export type {
  RawProfile,
  ResolvedProfile,
  ResolveOptions,
  ProfileInfo,
  ArtifactDescriptor,
  ArtifactMetadata,
  MaterializeResult,
  ArtifactCache,
  ProfileManifest
} from "./types";

// Error classes
export {
  ProfileNotFoundError,
  ExtendResolutionError,
  SchemaValidationError
} from "./errors";

// Factory
export * from "./factory";