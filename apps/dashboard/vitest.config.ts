/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'dashboard',
    environment: 'jsdom',
    setupFiles: ['../../test/setup-jsdom.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'build',
      'coverage',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../packages'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@types': path.resolve(__dirname, '../../packages/types/src'),
      '@utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/app': path.resolve(__dirname, './src/app'),
    },
  },
})