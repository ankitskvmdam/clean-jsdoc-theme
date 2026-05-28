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
    environment: 'happy-dom',
    globals: true,
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
  },
});
