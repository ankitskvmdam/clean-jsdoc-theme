import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { collectCacheInputs } from '../islands-cache';

// A working dir that does not exist on disk: node_modules classification is
// purely path-based, so no fixture files are needed.
const WD = resolve('/nonexistent-cjt-wd/project');

describe('collectCacheInputs()', () => {
  it('skips virtual / non-file namespaces', () => {
    expect(
      collectCacheInputs(['island-virtual:sidebar', '(disabled):fs', 'island-virtual:toc'], WD)
    ).toEqual([]);
  });

  it('hashes pnpm-style @clean-jsdoc-theme files as first-party', () => {
    const key =
      'node_modules/.pnpm/@clean-jsdoc-theme+utils@5.3.0/node_modules/@clean-jsdoc-theme/utils/dist/index.js';
    const pkgDir = resolve(
      WD,
      'node_modules/.pnpm/@clean-jsdoc-theme+utils@5.3.0/node_modules/@clean-jsdoc-theme/utils'
    );
    expect(collectCacheInputs([key], WD)).toEqual(
      [resolve(pkgDir, 'dist/index.js'), resolve(pkgDir, 'package.json')].sort()
    );
  });

  it('maps a scoped third-party file to its package.json only', () => {
    const keys = [
      'node_modules/@scope/lib/dist/a.js',
      'node_modules/@scope/lib/dist/b.js',
      'node_modules/lucide-preact/dist/esm/icons/x.js',
    ];
    expect(collectCacheInputs(keys, WD)).toEqual(
      [
        resolve(WD, 'node_modules/@scope/lib/package.json'),
        resolve(WD, 'node_modules/lucide-preact/package.json'),
      ].sort()
    );
  });

  it('keeps a drive-letter absolute key (not mistaken for a namespace)', () => {
    const key = 'D:/somewhere/node_modules/preact/dist/preact.module.js';
    const [only] = collectCacheInputs([key], WD);
    expect(only?.replace(/\\/g, '/')).toMatch(/node_modules\/preact\/package\.json$/);
  });
});
