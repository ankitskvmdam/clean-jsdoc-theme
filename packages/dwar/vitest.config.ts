/* eslint-disable */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    // Pagefind binary can take a moment, and each render() test bundles every
    // island chunk through esbuild — slow under whole-suite serial load.
    testTimeout: 120_000,
  },
});
