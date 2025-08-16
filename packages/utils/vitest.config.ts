/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'utils',
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
      '@': path.resolve(__dirname, '../'),
      '@types': path.resolve(__dirname, '../types/src'),
    },
  },
})