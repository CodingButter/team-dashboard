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
      reporter: ['text', 'json', 'html', 'lcov'],
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
        '**/test*/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // Enable UI for better test debugging
    ui: process.env.CI ? false : true,
    open: false,
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