/**
 * Appearance/asset options for the TypeDoc writer (#352): `colors` /
 * `darkColors` palette overrides and the custom CSS/JS injection options
 * (`customCss`, `customCssFile`, `customJs`, `customJsFile`, `hashCustomAssets`).
 *
 * Ported from the JSDoc bridge's `publish.ts` (`COLOR_KEYS`, `normalizeColors`,
 * `contentHash`, `copyCustomFiles`, `resolveCustomAssets`) — like the other small
 * helpers this bridge copies, we never cross-import the bridge package. The
 * behavior matches: file paths resolve against the working directory, files are
 * copied as-is to `_assets/<base>.<sha256-8>.<ext>` (or `<base><ext>` when
 * `hashCustomAssets` is `false`), and non-string, remote and unreadable entries
 * are warned about and skipped. Only the messages differ (this bridge's
 * `[clean-jsdoc-theme]` prefix).
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, extname, resolve as resolvePath } from 'node:path';
import type { OutputFile, ThemeColors } from '@clean-jsdoc-theme/dwar';
import type { ShikiGrammar, ThemeTokens } from '@clean-jsdoc-theme/utils';
import type { CleanJsdocThemeBlock } from './options';

/** Where an option problem is reported (the writer's strict-aware `optionLog`). */
interface WarnSink {
  warn(message: string): void;
}

/** The palette keys a user may override under `colors` / `darkColors`. */
const COLOR_KEYS = [
  'bg',
  'bgMuted',
  'fg',
  'fgMuted',
  'accent',
  'accentFg',
  'border',
  'codeHeaderBg',
  'codeHeaderFg',
  'codeHighlightBg',
] as const;

/**
 * Validate a user `colors`/`darkColors` object into a clean
 * `Partial<ThemeColors>`: keeps only the known palette keys whose value is a
 * non-empty string (trimmed), dropping everything else. Returns `undefined` when
 * the input is not an object or yields no usable keys. Values pass through
 * verbatim (any CSS color is valid).
 */
export function normalizeColors(raw: unknown): Partial<ThemeColors> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: Partial<ThemeColors> = {};
  for (const key of COLOR_KEYS) {
    const v = src[key];
    if (typeof v === 'string' && v.trim().length > 0) out[key] = v.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Trim a value to a non-empty string, or `undefined`. */
function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Short, deterministic content hash for cache-stable custom-asset filenames:
 * an unchanged file keeps its URL across builds, a changed one cache-busts.
 */
function contentHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

/**
 * Copy custom CSS/JS file(s) (a path or array, relative to the working dir) to
 * served `_assets` files and return their hrefs, in order. Each file is copied
 * as-is; an identical served name is emitted once. A non-string entry (v4's
 * `{ href, integrity }` CDN objects) or a remote URL is skipped with a warning
 * naming `remoteAlternative`; an unreadable file is skipped with a warning.
 */
async function copyCustomFiles(
  raw: unknown,
  ext: '.css' | '.js',
  hash: boolean,
  label: string,
  remoteAlternative: string,
  hrefForServed: (servedPath: string) => string,
  logger: WarnSink
): Promise<{ links: string[]; files: OutputFile[] }> {
  const entries = raw === undefined || raw === null ? [] : Array.isArray(raw) ? raw : [raw];
  const paths: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'string') {
      logger.warn(
        `[clean-jsdoc-theme] ${label} takes local file paths; skipping ${JSON.stringify(entry)}. ` +
          `For a remote file, download it or ${remoteAlternative}.`
      );
      continue;
    }
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(trimmed)) {
      logger.warn(
        `[clean-jsdoc-theme] ${label} only copies local files; skipping '${trimmed}'. ` +
          `Download it, or ${remoteAlternative}.`
      );
      continue;
    }
    paths.push(trimmed);
  }
  const links: string[] = [];
  const files: OutputFile[] = [];
  const seen = new Set<string>();
  for (const trimmed of paths) {
    let bytes: Buffer;
    try {
      bytes = await readFile(resolvePath(trimmed));
    } catch {
      logger.warn(`[clean-jsdoc-theme] could not read ${label} ('${trimmed}'); skipping it.`);
      continue;
    }
    const base = basename(trimmed, extname(trimmed)) || 'custom';
    const name = hash ? `${base}.${contentHash(bytes)}${ext}` : `${base}${ext}`;
    const servedPath = `_assets/${name}`;
    if (seen.has(servedPath)) continue;
    seen.add(servedPath);
    // The OutputFile path stays relative; only the served href gets the base.
    files.push({ path: servedPath, contents: bytes });
    links.push(hrefForServed(servedPath));
  }
  return { links, files };
}

/**
 * Resolve the custom CSS/JS options into render-ready `ThemeConfig` fields plus
 * the asset files to write. Inline strings pass through (trimmed); file options
 * are read + copied here (the bridge is the I/O layer, so dwar's `render()`
 * stays pure and just links the hrefs). `hashCustomAssets` (default `true`)
 * toggles the content-hash suffix.
 */
export async function resolveCustomAssets(
  block: Pick<
    CleanJsdocThemeBlock,
    'customCss' | 'customJs' | 'customCssFile' | 'customJsFile' | 'hashCustomAssets'
  >,
  hrefForServed: (servedPath: string) => string,
  logger: WarnSink
): Promise<{
  theme: {
    customCss?: string;
    customCssLinks?: string[];
    customJs?: string;
    customJsLinks?: string[];
  };
  files: OutputFile[];
}> {
  const hash = block.hashCustomAssets !== false; // content-hashed by default
  // Sequential (not Promise.all) so warnings print in option order.
  const cssAssets = await copyCustomFiles(
    block.customCssFile,
    '.css',
    hash,
    'customCssFile',
    '`@import url(…)` it from `customCss`',
    hrefForServed,
    logger
  );
  const jsAssets = await copyCustomFiles(
    block.customJsFile,
    '.js',
    hash,
    'customJsFile',
    'load it from `customJs` (e.g. append a `<script src>`)',
    hrefForServed,
    logger
  );
  const customCss = nonEmptyString(block.customCss);
  const customJs = nonEmptyString(block.customJs);
  return {
    theme: {
      ...(customCss ? { customCss } : {}),
      ...(cssAssets.links.length > 0 ? { customCssLinks: cssAssets.links } : {}),
      ...(customJs ? { customJs } : {}),
      ...(jsAssets.links.length > 0 ? { customJsLinks: jsAssets.links } : {}),
    },
    files: [...cssAssets.files, ...jsAssets.files],
  };
}

/** The user grammar/alias half of `ThemeTokens.shiki`. */
export type ShikiLangOptions = Pick<ThemeTokens['shiki'], 'langs' | 'langAlias'>;

/**
 * Validate `cleanJsdocTheme.shiki`. Copied from the JSDoc bridge's `resolveShikiLangs`: read each `langs` grammar file (a
 * `.tmLanguage.json` path) and keep the string entries of `langAlias`, keys
 * lowercased to match fence lookup. Unreadable or invalid grammars are warned
 * about and skipped. Returns `undefined` when nothing usable is configured.
 */
export async function resolveShikiLangs(
  raw: unknown,
  logger: WarnSink
): Promise<ShikiLangOptions | undefined> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: ShikiLangOptions = {};

  const files = Array.isArray(src.langs) ? src.langs : src.langs === undefined ? [] : [src.langs];
  const langs: ShikiGrammar[] = [];
  for (const file of files) {
    const path = nonEmptyString(file)?.trim();
    if (!path) {
      logger.warn(
        '[clean-jsdoc-theme] shiki.langs entries must be grammar file paths; skipping one.'
      );
      continue;
    }
    let grammar: unknown;
    try {
      grammar = JSON.parse(await readFile(resolvePath(path), 'utf8'));
    } catch {
      logger.warn(`[clean-jsdoc-theme] could not read shiki grammar ('${path}'); skipping it.`);
      continue;
    }
    const g = grammar as Partial<ShikiGrammar> | null;
    if (!g || typeof g.scopeName !== 'string' || typeof g.name !== 'string' || !g.name) {
      logger.warn(
        `[clean-jsdoc-theme] shiki grammar '${path}' needs a "name" and "scopeName"; skipping it.`
      );
      continue;
    }
    langs.push(g as ShikiGrammar);
  }
  if (langs.length > 0) out.langs = langs;

  if (src.langAlias && typeof src.langAlias === 'object' && !Array.isArray(src.langAlias)) {
    const alias: Record<string, string> = {};
    for (const [key, value] of Object.entries(src.langAlias as Record<string, unknown>)) {
      const target = nonEmptyString(value)?.trim();
      if (key.trim() && target) alias[key.trim().toLowerCase()] = target;
    }
    if (Object.keys(alias).length > 0) out.langAlias = alias;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
