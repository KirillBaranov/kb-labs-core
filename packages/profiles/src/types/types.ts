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