import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'apps/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'services/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'build',
      'coverage',
      '**/*.d.ts',
    ],
    coverage: {
      provider: 'v8',
      enabled: true,
      clean: true,
      cleanOnRerun: true,
      reportsDirectory: './coverage',
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov', 'cobertura'],
      reportOnFailure: true,
      include: [
        'apps/**/src/**/*.{js,ts,tsx}',
        'packages/**/src/**/*.{js,ts,tsx}',
        'services/**/src/**/*.{js,ts,tsx}',
      ],
      exclude: [
        'node_modules',
        'dist',
        '.next',
        'build',
        'coverage',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        '**/test*/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/mock*/**',
        '**/__mocks__/**',
        '**/generated/**',
        '**/types/**',
        '**/constants/**',
        '**/index.{js,ts}',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Per-file thresholds for stricter quality control
        perFile: true,
        // Individual file thresholds can be lower to allow gradual improvement
        '**/*.{js,ts,tsx}': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
        // Stricter thresholds for utility and shared code
        'packages/utils/**/*.{js,ts}': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'packages/types/**/*.{js,ts}': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
      // Watermarks for visual coverage reporting
      watermarks: {
        statements: [75, 90],
        functions: [75, 90],
        branches: [75, 90],
        lines: [75, 90],
      },
      // Skip coverage for files with no tests
      skipFull: false,
      // All files should be included in coverage reporting
      all: true,
    },
    // Enable UI for better test debugging
    ui: process.env.CI ? false : true,
    open: false,
    // Reporter configuration
    reporter: process.env.CI ? ['verbose', 'github-actions'] : ['verbose'],
    outputFile: {
      junit: './coverage/junit.xml',
      json: './coverage/test-results.json',
    },
    // Projects configuration for monorepo
    projects: [
      'packages/*/vitest.config.ts',
      'apps/*/vitest.config.ts',
      'services/*/vitest.config.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './packages'),
      '@ui': path.resolve(__dirname, './packages/ui/src'),
      '@types': path.resolve(__dirname, './packages/types/src'),
      '@utils': path.resolve(__dirname, './packages/utils/src'),
    },
  },
  define: {
    __TEST__: true,
  },
})