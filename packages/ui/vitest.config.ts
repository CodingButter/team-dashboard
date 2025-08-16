/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'ui',
    environment: 'jsdom',
    setupFiles: ['../../test/setup-jsdom.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
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
      '@utils': path.resolve(__dirname, '../utils/src'),
    },
  },
})