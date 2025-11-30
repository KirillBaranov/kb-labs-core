import nodePreset from '@kb-labs/devkit/eslint/node.js'

export default [
  ...nodePreset,
  {
    rules: {
      // Disable import extensions requirement for this package
      'import/extensions': 'off',
    }
  }
]
