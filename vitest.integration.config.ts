import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'apps/**/*.integration.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'packages/**/*.integration.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'services/**/*.integration.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      '**/__tests__/**/*.integration.{js,mjs,cjs,ts,mts,cts}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'build',
      'coverage',
      '**/*.d.ts',
      '**/*.unit.{test,spec}.*',
      '**/*.performance.{test,spec}.*',
    ],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 10000, // 10 seconds for hooks
    // Integration tests may need more time for setup/teardown
    setupFiles: ['./test/setup-node.ts'],
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './coverage/integration',
      include: [
        'apps/**/src/**/*.{js,ts}',
        'packages/**/src/**/*.{js,ts}',
        'services/**/src/**/*.{js,ts}',
      ],
      exclude: [
        'node_modules',
        'dist',
        'build',
        'coverage',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test*/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/mock*/**',
        '**/__mocks__/**',
      ],
    },
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
    __INTEGRATION_TEST__: true,
  },
})