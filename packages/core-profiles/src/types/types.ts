export type ProfileKind = "review" | "tests" | "docs" | "assistant" | "composite";
export type ProfileScope = "repo" | "package" | "dir";

export type IOPolicy = {
    allow?: string[];
    deny?: string[];
    maxBytesPerFile?: number;
    maxFiles?: number;
    followSymlinks?: boolean;
};

export type DiffPolicy = {
    include?: string[];
    exclude?: string[];
};

export type Capabilities = {
    rag?: boolean;
    internet?: boolean;
    writeFs?: boolean;
    tools?: string[];
};

export type ProductConfig = {
    enabled?: boolean;
    config?: string;
    io?: IOPolicy;
    diff?: DiffPolicy;
    capabilities?: Capabilities;
    metadata?: Record<string, unknown>;
};

export type ResolvedProducts = Record<string, Required<ProductConfig>>;

export type ResolvedProfile = {
    name: string;
    kind: ProfileKind;
    scope: ProfileScope;
    version: string;
    roots: string[];      // where we looked
    files: string[];      // mounted/expanded files
    rules: unknown[];     // normalized later
    products: ResolvedProducts;
    meta: Record<string, unknown> & {
        extra?: {
            createdAt: string;
            resolver: {
                version: string;
                strict: boolean;
                logLevel: string;
            };
            source: {
                cwd: string;
                pathAbs: string;
                repoRoot: string;
            };
            chains: {
                extends: string[];
                overrides: string[];
            };
            counts: {
                files: number;
            };
            trace: {
                stages?: {
                    load?: number;
                    merge?: number;
                    validate?: number;
                };
            };
        };
    };
};

export type ResolveOptions = {
    cwd?: string;
    name?: string;               // default -> "default"
    product?: string;            // optional product focus
    strict?: boolean;            // fail on any inconsistency
    logLevel?: "silent" | "error" | "warn" | "info" | "debug";
};

export type ValidateError = {
    instancePath: string;
    message?: string;
    keyword?: string;
    schemaPath?: string;
    params?: Record<string, unknown>;
};

export type ValidateResult = {
    ok: boolean;
    errors: ValidateError[] | null;
};

// Raw profile type (not validated)
export type RawProfile = Record<string, unknown>;

// Load profile result
export type LoadProfileResult = {
    profile: RawProfile;
    meta: {
        pathAbs: string;
        repoRoot: string;
    };
};

export interface ProfileInfo {
  name: string;
  version: string;
  manifestPath: string;
  exports: Record<string, Record<string, string | string[]>>;
  extends?: string[];
  overlays?: string[];
}

export interface ArtifactDescriptor {
  product: string;
  key: string;
  selector?: string;
}

export interface ArtifactMetadata {
  absPath: string;
  relPath: string;
  sha256: string;
  size: number;
  mime: string;
}

export interface MaterializeResult {
  filesCopied: number;
  filesSkipped: number;
  bytesWritten: number;
  outputs: string[];
  manifest: Record<string, { relPath: string; sha256: string; size: number; }>;
}

export interface ArtifactCache {
  clearCaches(): void;
  getStats(): { size: number };
}

// New profile manifest schema (v1.0)
export interface ProfileManifest {
  $schema?: string;
  schemaVersion: '1.0';
  name: string;
  version: string;
  extends?: string[];
  overrides?: string[];
  exports: Record<string, Record<string, string | string[]>>;
  defaults: Record<string, { $ref: string }>;
  discovery?: {
    packages?: string[];
    languages?: string[];
  };
  metadata?: Record<string, unknown>;
}