module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  rules: {
    // File size enforcement - 200 line limit
    'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
    
    // Function complexity limits
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    'complexity': ['error', { max: 15 }],
    
    // Code quality rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // Import organization
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Best practices
    'no-console': 'warn',
    'no-debugger': 'error',
    'eqeqeq': 'error',
    'no-duplicate-imports': 'error',
  },
  overrides: [
    {
      files: ['apps/dashboard/**/*', 'apps/docs/**/*'],
      extends: ['next/core-web-vitals'],
      rules: {
        'react-hooks/exhaustive-deps': 'warn',
        'react/no-unescaped-entities': 'off',
      },
    },
    {
      files: ['**/*.test.*', '**/*.spec.*'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        'max-lines': 'off', // Allow longer test files
        'no-console': 'off', // Allow console in tests
      },
    },
    {
      files: ['**/*.config.*', '**/.*rc.*'],
      rules: {
        'max-lines': 'off', // Allow longer config files
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'out/',
    'coverage/',
    '*.d.ts',
  ],
}