/**
 * On-disk cache for the island bundle (see `bundleIslands`'s `cacheDir`).
 *
 * Two levels:
 *
 * 1. Pre-key (the file name): a hash of everything known BEFORE the build —
 *    cache format, esbuild version, the static esbuild options, outDir,
 *    resolveDir and each island's entry source. Different configurations get
 *    different files (`islands-v3-<preKey>.json`).
 * 2. Validated manifest (inside the file), derived from esbuild's metafile
 *    after a build:
 *    - inputs: `{ path, hash }` per fingerprinted file, re-hashed on read;
 *    - resolution edges: `{ from, name, dir }` per bare-specifier import — the
 *      importing package's root, the imported package name and the realpath
 *      Node-style lookup landed on. Re-resolved on read, so a repointed
 *      symlink/junction (a pnpm version bump leaves the old store dir behind),
 *      a newly added nested copy or a hoisting change is a miss even though
 *      the previously bundled files are untouched.
 *    Any mismatch, missing file or failed lookup is a miss, and the rebuild
 *    overwrites the same file.
 *
 * Hybrid fingerprint (keeps a warm hit at a few ms instead of hashing ~1,800
 * bundled files): every bundled `@clean-jsdoc-theme/*` file and every file
 * outside node_modules (workspace realpaths) is content-hashed; a third-party
 * package under node_modules is represented by its root `package.json` (its
 * version) plus the edges recording where it resolves.
 *
 * Accepted limitations: an in-place edit to a third-party file that leaves its
 * package.json unchanged (e.g. patch-package) is not detected; edges are
 * checked from each importing package's root, so a `node_modules` nested in a
 * package's subdirectory, or resolution changed by something other than the
 * node_modules walk (aliases, `browser` maps of an unchanged package), is not
 * re-checked; nor is an edit landing in the milliseconds between esbuild
 * reading a file and it being hashed here. Escape hatch: delete
 * `node_modules/.cache/clean-jsdoc-theme`.
 *
 * Everything here is best-effort: reads never throw (any problem is a miss),
 * and a failed write leaves no partial file behind (temp file + rename).
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { BundleIslandsResult } from './islands-bundle';

export const ISLAND_CACHE_FORMAT = 3;

/** esbuild namespace of the virtual `island:<name>` entry modules. */
export const ISLAND_VIRTUAL_NAMESPACE = 'island-virtual';

export interface IslandCacheInput {
  /** Absolute path of a file the bundle depends on. */
  path: string;
  /** sha256 hex of the file's contents. */
  hash: string;
}

export interface IslandCacheEdge {
  /** Directory the lookup starts from (the importing package's root). */
  from: string;
  /** Imported package name (`preact`, `@clean-jsdoc-theme/utils`). */
  name: string;
  /** Realpath of the `node_modules/<name>` directory the lookup found. */
  dir: string;
}

export interface IslandCacheEntry {
  format: typeof ISLAND_CACHE_FORMAT;
  inputs: IslandCacheInput[];
  edges: IslandCacheEdge[];
  result: BundleIslandsResult;
}

export interface IslandPreKeyParts {
  esbuildVersion: string;
  /** Static esbuild options; JSON-stringified into the key. */
  buildOptions: unknown;
  outDir: string;
  resolveDir: string;
  /** Island entries in caller order. */
  entries: Array<{ name: string; source: string }>;
}

/** The subset of an esbuild metafile input this module reads. */
export interface MetafileInputLike {
  imports?: Array<{ path: string; original?: string; external?: boolean }>;
}

const FIRST_PARTY_SCOPE = '@clean-jsdoc-theme/';
const NODE_MODULES = '/node_modules/';
const VIRTUAL_PREFIX = `${ISLAND_VIRTUAL_NAMESPACE}:`;

function sha256(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Cache file name for a build configuration: `islands-v3-<16 hex>.json`. */
export function islandCacheFileName(parts: IslandPreKeyParts): string {
  const keyParts: string[] = [
    `format:${ISLAND_CACHE_FORMAT}`,
    `esbuild:${parts.esbuildVersion}`,
    `options:${JSON.stringify(parts.buildOptions)}`,
    `outDir:${parts.outDir}`,
    `resolveDir:${parts.resolveDir}`,
  ];
  for (const entry of parts.entries) {
    keyParts.push(`entry:${entry.name}`, entry.source);
  }
  return `islands-v${ISLAND_CACHE_FORMAT}-${sha256(keyParts.join('\x00')).slice(0, 16)}.json`;
}

/**
 * True for metafile paths that are not files on disk: our virtual entries and
 * esbuild's own `(disabled):…` / `<runtime>`-style forms.
 */
function isNonFilePath(key: string): boolean {
  return key.startsWith(VIRTUAL_PREFIX) || key.startsWith('(disabled):') || key.startsWith('<');
}

/** `{ pkgDir, name }` when `abs` lies inside a node_modules package. */
function nodeModulesPackage(abs: string): { pkgDir: string; name: string } | undefined {
  const slashed = abs.replace(/\\/g, '/');
  const nm = slashed.lastIndexOf(NODE_MODULES);
  if (nm === -1) return undefined;
  const rest = slashed.slice(nm + NODE_MODULES.length).split('/');
  const nameSegments = rest[0]?.startsWith('@') ? 2 : 1;
  if (rest.length <= nameSegments) return undefined;
  const name = rest.slice(0, nameSegments).join('/');
  return { pkgDir: resolve(slashed.slice(0, nm + NODE_MODULES.length) + name), name };
}

function makeNearestPackageJson(): (dir: string) => string | undefined {
  const memo = new Map<string, string | undefined>();
  const nearest = (dir: string): string | undefined => {
    if (memo.has(dir)) return memo.get(dir);
    const candidate = join(dir, 'package.json');
    let found: string | undefined;
    if (existsSync(candidate)) {
      found = candidate;
    } else {
      const parent = dirname(dir);
      found = parent === dir ? undefined : nearest(parent);
    }
    memo.set(dir, found);
    return found;
  };
  return nearest;
}

/**
 * Map esbuild metafile input keys (paths relative to `absWorkingDir`, or
 * namespaced virtual modules) to the absolute files the cache must fingerprint,
 * following the hybrid rule above. Returns deduped, sorted OS paths.
 */
export function collectCacheInputs(metafileInputKeys: string[], absWorkingDir: string): string[] {
  const out = new Set<string>();
  const nearestPackageJson = makeNearestPackageJson();

  for (const key of metafileInputKeys) {
    if (isNonFilePath(key)) continue;

    const abs = resolve(absWorkingDir, key);
    const pkg = nodeModulesPackage(abs);

    if (!pkg) {
      // Workspace realpath (first-party source/dist outside node_modules).
      out.add(abs);
      const pkgJson = nearestPackageJson(dirname(abs));
      if (pkgJson) out.add(pkgJson);
      continue;
    }

    out.add(join(pkg.pkgDir, 'package.json'));
    if (pkg.name.startsWith(FIRST_PARTY_SCOPE)) out.add(abs);
  }

  return [...out].sort();
}

/**
 * Node-style package lookup: walk up from `fromDir` to the first
 * `node_modules/<name>` that exists, and return its realpath (following
 * symlinks/junctions). `undefined` when none is found.
 */
export function resolvePackageDir(fromDir: string, name: string): string | undefined {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(candidate)) {
      try {
        return realpathSync.native(candidate);
      } catch {
        return undefined;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** Package name of a bare import specifier (`@s/p/x` → `@s/p`), else undefined. */
function bareSpecifierPackage(spec: string): string | undefined {
  // Relative, absolute, drive-letter and `scheme:` specifiers aren't bare.
  if (/^(?:\.|\/|\\|[A-Za-z][A-Za-z0-9+.-]*:)/.test(spec)) return undefined;
  const segments = spec.split('/');
  if (spec.startsWith('@')) {
    return segments.length >= 2 && segments[1] ? `${segments[0]}/${segments[1]}` : undefined;
  }
  return segments[0] || undefined;
}

/**
 * Resolution edges for every package import in the bundle: from the importing
 * package's root (or `resolveDir` for the virtual entries) to the realpath the
 * node_modules lookup finds. Imports whose lookup finds nothing (resolved some
 * other way) are left out. Returns deduped edges, sorted.
 */
export function collectResolutionEdges(
  metafileInputs: Record<string, MetafileInputLike>,
  absWorkingDir: string,
  resolveDir: string
): IslandCacheEdge[] {
  const nearestPackageJson = makeNearestPackageJson();
  const edges = new Map<string, IslandCacheEdge>();

  for (const [key, input] of Object.entries(metafileInputs)) {
    let from: string;
    if (key.startsWith(VIRTUAL_PREFIX)) {
      from = resolve(resolveDir);
    } else if (isNonFilePath(key)) {
      continue;
    } else {
      const abs = resolve(absWorkingDir, key);
      const pkg = nodeModulesPackage(abs);
      const pkgJson = pkg ? undefined : nearestPackageJson(dirname(abs));
      from = pkg ? pkg.pkgDir : pkgJson ? dirname(pkgJson) : dirname(abs);
    }

    for (const imp of input.imports ?? []) {
      if (imp.external || isNonFilePath(imp.path)) continue;
      const name =
        imp.original !== undefined
          ? bareSpecifierPackage(imp.original)
          : nodeModulesPackage(resolve(absWorkingDir, imp.path))?.name;
      if (!name) continue;
      const id = `${from}\x00${name}`;
      if (edges.has(id)) continue;
      const dir = resolvePackageDir(from, name);
      if (dir) edges.set(id, { from, name, dir });
    }
  }

  return [...edges.values()].sort((a, b) =>
    a.from === b.from ? (a.name < b.name ? -1 : 1) : a.from < b.from ? -1 : 1
  );
}

function isStringRecord(value: unknown, keys: string[]): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return keys.every((k) => typeof record[k] === 'string');
}

function isValidEntry(value: unknown): value is IslandCacheEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<IslandCacheEntry>;
  if (entry.format !== ISLAND_CACHE_FORMAT) return false;
  if (!Array.isArray(entry.inputs) || entry.inputs.length === 0) return false;
  if (!entry.inputs.every((input) => isStringRecord(input, ['path', 'hash']))) return false;
  if (!Array.isArray(entry.edges)) return false;
  if (!entry.edges.every((edge) => isStringRecord(edge, ['from', 'name', 'dir']))) return false;
  const result = entry.result;
  if (!result || typeof result !== 'object') return false;
  if (!Array.isArray(result.files)) return false;
  if (!result.files.every((f) => isStringRecord(f, ['path', 'contents']))) return false;
  if (!result.entryPaths || typeof result.entryPaths !== 'object') return false;
  return Object.values(result.entryPaths).every((p) => typeof p === 'string');
}

async function hashFile(path: string): Promise<string> {
  return sha256(await readFile(path));
}

/**
 * Return the cached bundle only when the file is a well-formed current-format
 * entry, every recorded input still hashes the same AND every recorded package
 * import still resolves to the same directory. Never throws.
 */
export async function readIslandCache(file: string): Promise<BundleIslandsResult | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
    if (!isValidEntry(parsed)) return undefined;
    for (const edge of parsed.edges) {
      if (resolvePackageDir(edge.from, edge.name) !== edge.dir) return undefined;
    }
    const matches = await Promise.all(
      parsed.inputs.map(async (input) => {
        try {
          return (await hashFile(input.path)) === input.hash;
        } catch {
          return false;
        }
      })
    );
    return matches.every(Boolean) ? parsed.result : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Hash `inputPaths` and atomically write the entry with its resolution
 * `edges`. Throws when an input can't be read or the write fails (the caller
 * swallows it — nothing is cached).
 */
export async function writeIslandCache(
  file: string,
  inputPaths: string[],
  edges: IslandCacheEdge[],
  result: BundleIslandsResult
): Promise<void> {
  const inputs: IslandCacheInput[] = await Promise.all(
    inputPaths.map(async (path) => ({ path, hash: await hashFile(path) }))
  );
  const entry: IslandCacheEntry = { format: ISLAND_CACHE_FORMAT, inputs, edges, result };

  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(entry));
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}
