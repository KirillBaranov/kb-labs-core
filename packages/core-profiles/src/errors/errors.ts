export class ProfileError extends Error {
  constructor(message: string, public override cause?: unknown) {
    super(message);
    this.name = 'ProfileError';
  }
}

export class ProfileNotFoundError extends ProfileError {
  constructor(public where: string) {
    super(`Profile not found at: ${where}`);
    this.name = 'ProfileNotFoundError';
  }
}

export class ProfileSchemaError extends ProfileError {
  constructor(public errors: unknown) {
    super('Profile validation failed');
    this.name = 'ProfileSchemaError';
  }
}

export class ExtendResolutionError extends ProfileError {
  constructor(public ref: string, cause?: unknown) {
    super(`Failed to resolve extends: ${ref}`, cause);
    this.name = 'ExtendResolutionError';
  }
}

export class AllowDenyConflictError extends ProfileError {
  constructor(public path: string, public pattern: string) {
    super(`allow/deny conflict at "${path}" for pattern "${pattern}"`);
    this.name = 'AllowDenyConflictError';
  }
}

export class SchemaValidationError extends ProfileError {
  constructor(public errors: unknown) {
    super('Schema validation failed');
    this.name = 'SchemaValidationError';
  }
}