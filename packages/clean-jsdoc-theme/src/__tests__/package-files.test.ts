import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// The package root (this file is src/__tests__/package-files.test.ts). Turbo
// runs `test` after `build`, so `dist/` exists here as it would in the tarball.
const pkgRoot = fileURLToPath(new URL('../../', import.meta.url));

describe('published package layout', () => {
  it('ships every path listed in package.json `files`', () => {
    const { files } = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')) as {
      files: string[];
    };
    const missing = files.filter((f) => !existsSync(join(pkgRoot, f)));
    expect(missing).toEqual([]);
  });

  it('works as a JSDoc template from the package root', () => {
    // JSDoc loads a template with require(`${opts.template}/publish`); configs
    // point `template` at either the package root or its `dist/`.
    const load = createRequire(import.meta.url);
    for (const template of [pkgRoot, join(pkgRoot, 'dist')]) {
      const mod = load(join(template, 'publish')) as { publish?: unknown };
      expect(typeof mod.publish).toBe('function');
    }
  });
});
