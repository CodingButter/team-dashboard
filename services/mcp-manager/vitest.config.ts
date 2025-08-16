/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'mcp-manager',
    environment: 'node',
    setupFiles: ['../../test/setup-node.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'coverage',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../packages'),
      '@types': path.resolve(__dirname, '../../packages/types/src'),
      '@utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
})