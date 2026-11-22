/**
 * On-disk cache for the island bundle (see `bundleIslands`'s `cacheDir`).
 *
 * Two levels:
 *
 * 1. Pre-key (the file name): a hash of everything known BEFORE the build —
 *    cache format, esbuild version, the static esbuild options, outDir,
 *    resolveDir and each island's entry source. Different configurations get
 *    different files (`islands-v2-<preKey>.json`).
 * 2. Validated manifest (inside the file): after a build, the bundle's real
 *    inputs are read from esbuild's metafile and recorded as `{ path, hash }`.
 *    A later run re-hashes them; any mismatch or unreadable input is a miss,
 *    and the rebuild overwrites the same file.
 *
 * Hybrid fingerprint (keeps a warm hit at a few ms instead of hashing ~1,800
 * bundled files): every bundled `@clean-jsdoc-theme/*` file and every file
 * outside node_modules (workspace realpaths) is content-hashed; a third-party
 * package under node_modules is represented by its root `package.json`. The
 * owning package.json of every input is always recorded too.
 *
 * Accepted limitations: an in-place edit to a third-party file that leaves its
 * package.json unchanged (e.g. patch-package) is not detected, nor is a
 * shadowing copy that alters no recorded file, nor an edit landing in the
 * milliseconds between esbuild reading a file and it being hashed here. Escape
 * hatch: delete `node_modules/.cache/clean-jsdoc-theme`.
 *
 * Everything here is best-effort: reads never throw (any problem is a miss),
 * and a failed write leaves no partial file behind (temp file + rename).
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { BundleIslandsResult } from './islands-bundle';

export const ISLAND_CACHE_FORMAT = 2;

export interface IslandCacheInput {
  /** Absolute path of a file the bundle depends on. */
  path: string;
  /** sha256 hex of the file's contents. */
  hash: string;
}

export interface IslandCacheEntry {
  format: typeof ISLAND_CACHE_FORMAT;
  inputs: IslandCacheInput[];
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

const FIRST_PARTY_SCOPE = '@clean-jsdoc-theme/';
const NODE_MODULES = '/node_modules/';

function sha256(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Cache file name for a build configuration: `islands-v2-<16 hex>.json`. */
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
 * Map esbuild metafile input keys (paths relative to `absWorkingDir`, or
 * namespaced virtual modules) to the absolute files the cache must fingerprint,
 * following the hybrid rule above. Returns deduped, sorted OS paths.
 */
export function collectCacheInputs(metafileInputKeys: string[], absWorkingDir: string): string[] {
  const out = new Set<string>();
  const nearestPkgCache = new Map<string, string | undefined>();

  const nearestPackageJson = (dir: string): string | undefined => {
    if (nearestPkgCache.has(dir)) return nearestPkgCache.get(dir);
    const candidate = join(dir, 'package.json');
    let found: string | undefined;
    if (existsSync(candidate)) {
      found = candidate;
    } else {
      const parent = dirname(dir);
      found = parent === dir ? undefined : nearestPackageJson(parent);
    }
    nearestPkgCache.set(dir, found);
    return found;
  };

  for (const key of metafileInputKeys) {
    // Skip non-file namespaces (`island-virtual:sidebar`, `(disabled):…`) but
    // keep Windows drive-letter paths (`D:/…`), whose prefix is one character.
    if (/^[^/\\]{2,}:/.test(key)) continue;

    const abs = resolve(absWorkingDir, key);
    const slashed = abs.replace(/\\/g, '/');
    const nm = slashed.lastIndexOf(NODE_MODULES);

    if (nm === -1) {
      // Workspace realpath (first-party source/dist outside node_modules).
      out.add(abs);
      const pkg = nearestPackageJson(dirname(abs));
      if (pkg) out.add(pkg);
      continue;
    }

    const rest = slashed.slice(nm + NODE_MODULES.length).split('/');
    const nameSegments = rest[0]?.startsWith('@') ? 2 : 1;
    if (rest.length <= nameSegments) continue;
    const pkgName = rest.slice(0, nameSegments).join('/');
    const pkgDir = resolve(slashed.slice(0, nm + NODE_MODULES.length) + pkgName);
    out.add(join(pkgDir, 'package.json'));
    if (pkgName.startsWith(FIRST_PARTY_SCOPE)) out.add(abs);
  }

  return [...out].sort();
}

function isValidEntry(value: unknown): value is IslandCacheEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<IslandCacheEntry>;
  if (entry.format !== ISLAND_CACHE_FORMAT) return false;
  if (!Array.isArray(entry.inputs) || entry.inputs.length === 0) return false;
  for (const input of entry.inputs) {
    if (
      !input ||
      typeof input !== 'object' ||
      typeof input.path !== 'string' ||
      typeof input.hash !== 'string'
    ) {
      return false;
    }
  }
  const result = entry.result;
  return (
    !!result &&
    typeof result === 'object' &&
    Array.isArray(result.files) &&
    !!result.entryPaths &&
    typeof result.entryPaths === 'object'
  );
}

async function hashFile(path: string): Promise<string> {
  return sha256(await readFile(path));
}

/**
 * Return the cached bundle only when the file is a well-formed current-format
 * entry AND every recorded input still hashes the same. Never throws.
 */
export async function readIslandCache(file: string): Promise<BundleIslandsResult | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
    if (!isValidEntry(parsed)) return undefined;
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
 * Hash `inputPaths` and atomically write the entry. Throws when an input can't
 * be read or the write fails (the caller swallows it — nothing is cached).
 */
export async function writeIslandCache(
  file: string,
  inputPaths: string[],
  result: BundleIslandsResult
): Promise<void> {
  const inputs: IslandCacheInput[] = await Promise.all(
    inputPaths.map(async (path) => ({ path, hash: await hashFile(path) }))
  );
  const entry: IslandCacheEntry = { format: ISLAND_CACHE_FORMAT, inputs, result };

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
