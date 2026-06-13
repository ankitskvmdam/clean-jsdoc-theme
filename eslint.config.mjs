import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', '**/examples/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // bhasha is bundled into the browser by rang, so it must stay isomorphic:
    // no `node:*` builtins, no Node-only modules. (A grep backstop also runs in
    // bhasha's `lint` script — see scripts/check-browser-safe.mjs.)
    files: ['packages/bhasha/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'os', 'crypto', 'zlib', 'child_process', 'stream'],
              message:
                'bhasha must stay browser-safe — no Node builtins (rang bundles it into the browser).',
            },
          ],
        },
      ],
    },
  }
);
