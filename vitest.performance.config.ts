import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'apps/**/*.performance.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'packages/**/*.performance.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'services/**/*.performance.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      '**/__tests__/**/*.performance.{js,mjs,cjs,ts,mts,cts}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'build',
      'coverage',
      '**/*.d.ts',
      '**/*.unit.{test,spec}.*',
      '**/*.integration.{test,spec}.*',
    ],
    testTimeout: 60000, // 60 seconds for performance tests
    hookTimeout: 15000, // 15 seconds for hooks
    // Performance tests need longer timeouts
    setupFiles: ['./test/setup-node.ts'],
    // No coverage for performance tests as they focus on timing
    coverage: {
      enabled: false,
    },
    // Performance-specific configuration
    benchmark: {
      include: [
        'apps/**/*.bench.{js,mjs,cjs,ts,mts,cts}',
        'packages/**/*.bench.{js,mjs,cjs,ts,mts,cts}',
        'services/**/*.bench.{js,mjs,cjs,ts,mts,cts}',
      ],
      exclude: [
        'node_modules',
        'dist',
        '.next',
        'build',
        'coverage',
        '**/*.d.ts',
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
    __PERFORMANCE_TEST__: true,
  },
})