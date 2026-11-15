import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// #342: under Yarn PnP every page failed with "Cannot read properties of
// undefined (reading 'context')". The packages that create and read Preact
// contexts each listed `preact` under `dependencies`, so PnP could hand them
// separate copies. The fix is a manifest rule, checked here: packages that
// import preact take it as a peer, and the packages users install provide it.

const packagesDir = fileURLToPath(new URL('../../../', import.meta.url));

interface Manifest {
  name: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const manifest = (dir: string): Manifest =>
  JSON.parse(readFileSync(join(packagesDir, dir, 'package.json'), 'utf8')) as Manifest;

/** Does any built file of `dir` import preact (or a preact subpath)? */
function distImportsPreact(dir: string): boolean {
  const dist = join(packagesDir, dir, 'dist');
  const files = readdirSync(dist, { recursive: true, encoding: 'utf8' }).filter((f) =>
    /\.(js|mjs|cjs)$/.test(f)
  );
  return files.some((f) =>
    /(from\s*|import\s*|require\()["']preact(\/[a-z-]+)?["']/.test(
      readFileSync(join(dist, f), 'utf8')
    )
  );
}

const all = readdirSync(packagesDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

/** The packages users install; everything else reaches users through them. */
const ENTRY_POINTS = ['clean-jsdoc-theme', 'typedoc', 'aadesh'];
/** Packages whose own dependencies pull in preact-bound code (rang, dwar, bhasha, setu). */
const PREACT_BOUND = ['rang', 'dwar', 'bhasha', 'setu'];

describe('one preact instance for every package manager (#342)', () => {
  it('covers every workspace package', () => {
    expect(
      all.sort(),
      'a workspace package was added or removed: classify it in ENTRY_POINTS (users install it) ' +
        'or PREACT_BOUND (it imports preact), then update this list'
    ).toEqual(
      ['aadesh', 'bhasha', 'clean-jsdoc-theme', 'dwar', 'rang', 'setu', 'typedoc', 'utils'].sort()
    );
  });

  it.each(PREACT_BOUND)('%s takes preact as a peer, never as its own dependency', (dir) => {
    const pkg = manifest(dir);
    expect(pkg.peerDependencies?.preact).toBeDefined();
    expect(pkg.dependencies?.preact).toBeUndefined();
  });

  it.each(ENTRY_POINTS)('%s provides preact to the packages below it', (dir) => {
    expect(manifest(dir).dependencies?.preact).toBeDefined();
  });

  it('no internal package bundles or privately depends on preact', () => {
    for (const dir of all.filter((d) => !ENTRY_POINTS.includes(d))) {
      const pkg = manifest(dir);
      expect(pkg.dependencies?.preact, `${pkg.name} dependencies.preact`).toBeUndefined();
      if (distImportsPreact(dir)) {
        expect(pkg.peerDependencies?.preact, `${pkg.name} peerDependencies.preact`).toBeDefined();
      }
    }
  });

  it('the packages that render with preact import it instead of inlining a copy', () => {
    for (const dir of ['rang', 'dwar', 'bhasha']) {
      expect(distImportsPreact(dir), `${dir}/dist imports preact`).toBe(true);
    }
  });

  it('entry points and internals agree on one preact range', () => {
    const ranges = new Set(
      all.flatMap((dir) => {
        const pkg = manifest(dir);
        return [pkg.dependencies?.preact, pkg.peerDependencies?.preact].filter(Boolean);
      })
    );
    expect([...ranges]).toHaveLength(1);
  });
});
