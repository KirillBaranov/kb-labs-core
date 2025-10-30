// Core exports
export * from './types'
export * from './runtime'
export * from './utils'
export * from './utils/paths'

// Enhanced config system exports
export * from './errors/kb-error'
export * from './cache/fs-cache'
export * from './hash/config-hash'
export * from './api/read-config'
export * from './merge/layered-merge'
export * from './api/product-config'
export * from './preset/resolve-preset'
export * from './lockfile/lockfile'
export * from './types/preset'

// Init system exports
export * from './types/init'
export * from './api/init-workspace'
export * from './api/upsert-lockfile'
export * from './utils/fs-atomic'

// Re-export clearCaches for convenience
export { clearCaches } from './cache/fs-cache'

// Validation API
export { validateProductConfig } from './validation/validate-config'
