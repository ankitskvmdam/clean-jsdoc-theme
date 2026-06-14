/**
 * Convert between the human-friendly {@link LocaleFile} (nested `chrome`, flat
 * `api`, metadata blocks) and the flat `fullKey → value` form the merge works
 * on, plus deterministic serialization so a no-change re-extract is a zero git
 * diff (the plan's determinism requirement).
 *
 * Key spaces: chrome keys are `chrome.<a>.<b>` (nested in the file); api keys are
 * `api.<longname>#<field>` (stored under `api` WITHOUT the `api.` prefix, since
 * they're already in that namespace). `_hashes`/`_obsolete` use the full key.
 */

import { LOCALE_FILE_VERSION, type ChromeTree, type FlatEntry, type LocaleFile } from './types';

const CHROME_PREFIX = 'chrome.';
const API_PREFIX = 'api.';

/** An empty, current-version locale file. */
export function emptyLocaleFile(): LocaleFile {
  return { _version: LOCALE_FILE_VERSION, chrome: {}, api: {}, _hashes: {}, _obsolete: {} };
}

/** Set a dotted `chrome.a.b` key into a nested tree, creating intermediate objects. */
function setNested(tree: ChromeTree, dottedPath: string, value: string): void {
  const parts = dottedPath.split('.');
  let node = tree;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    const next = node[seg];
    if (typeof next === 'object' && next !== null) {
      node = next;
    } else {
      const created: ChromeTree = {};
      node[seg] = created;
      node = created;
    }
  }
  node[parts[parts.length - 1]] = value;
}

/** Walk a nested chrome tree into `chrome.a.b → value` pairs (depth-first, in order). */
function flattenChrome(tree: ChromeTree, prefix: string, out: Map<string, string>): void {
  for (const [seg, val] of Object.entries(tree)) {
    const key = `${prefix}${seg}`;
    if (typeof val === 'string') out.set(key, val);
    else if (val && typeof val === 'object') flattenChrome(val, `${key}.`, out);
  }
}

/**
 * Flatten a locale file's ACTIVE entries (not `_obsolete`) to `fullKey → {value,
 * hash}`. The value comes from `chrome`/`api`; the hash from `_hashes` (missing →
 * empty, treated as "needs a hash" by the merge).
 */
export function flattenLocaleFile(file: LocaleFile): Map<string, FlatEntry> {
  const out = new Map<string, FlatEntry>();

  const chrome = new Map<string, string>();
  flattenChrome(file.chrome ?? {}, CHROME_PREFIX, chrome);
  for (const [key, value] of chrome) {
    out.set(key, { value, hash: file._hashes?.[key] ?? '' });
  }

  for (const [apiKey, value] of Object.entries(file.api ?? {})) {
    const key = `${API_PREFIX}${apiKey}`;
    out.set(key, { value, hash: file._hashes?.[key] ?? '' });
  }

  return out;
}

/** Read the soft-deleted entries (full key → {value, hash}). */
export function obsoleteEntries(file: LocaleFile): Map<string, FlatEntry> {
  const out = new Map<string, FlatEntry>();
  for (const [key, entry] of Object.entries(file._obsolete ?? {})) {
    out.set(key, { value: entry.value, hash: entry.hash });
  }
  return out;
}

/** Sort an object's keys for stable, diff-friendly serialization. */
function sortedRecord<T>(record: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of Object.keys(record).sort()) out[key] = record[key];
  return out;
}

/**
 * Build a {@link LocaleFile} from active flat entries + soft-deleted entries.
 * `templateOrder` fixes the chrome nesting + api key order to the template's, so
 * output is deterministic regardless of Map iteration. api keys are sorted; the
 * nested chrome tree follows `templateOrder`.
 */
export function toLocaleFile(
  active: Map<string, FlatEntry>,
  obsolete: Map<string, FlatEntry>,
  templateOrder: readonly string[]
): LocaleFile {
  const chrome: ChromeTree = {};
  const api: Record<string, string> = {};
  const hashes: Record<string, string> = {};

  // Emit in template order so the nested chrome tree + key insertion are stable.
  const ordered = [...templateOrder].filter((k) => active.has(k));
  for (const key of ordered) {
    const entry = active.get(key)!;
    if (key.startsWith(CHROME_PREFIX)) {
      setNested(chrome, key.slice(CHROME_PREFIX.length), entry.value);
    } else if (key.startsWith(API_PREFIX)) {
      api[key.slice(API_PREFIX.length)] = entry.value;
    }
    if (entry.hash) hashes[key] = entry.hash;
  }

  const obsoleteOut: LocaleFile['_obsolete'] = {};
  for (const [key, entry] of obsolete) {
    obsoleteOut[key] = { value: entry.value, hash: entry.hash };
  }

  return {
    _version: LOCALE_FILE_VERSION,
    chrome,
    api: sortedRecord(api),
    _hashes: sortedRecord(hashes),
    _obsolete: sortedRecord(obsoleteOut),
  };
}

/**
 * Split a locale file's NON-EMPTY translations into the flat message maps the
 * build consumes: `chrome` (full `chrome.*` keys → bhasha's `LanguageProvider`)
 * and `api` (full `api.*` keys → setu's `stampSite`). Empty (untranslated)
 * values are omitted so each side falls back to its default/source.
 */
export function localeMessages(file: LocaleFile): {
  chrome: Record<string, string>;
  api: Record<string, string>;
} {
  const chrome: Record<string, string> = {};
  const api: Record<string, string> = {};
  for (const [key, entry] of flattenLocaleFile(file)) {
    if (entry.value === '') continue;
    if (key.startsWith(CHROME_PREFIX)) chrome[key] = entry.value;
    else if (key.startsWith(API_PREFIX)) api[key] = entry.value;
  }
  return { chrome, api };
}

/**
 * Serialize the **editable** half of a locale file — `_version` + the human
 * `chrome`/`api` translations — to deterministic, diff-friendly JSON (2-space,
 * trailing newline). The auto-managed `_hashes`/`_obsolete` live in a sibling
 * meta file (see {@link serializeLocaleMeta}), so this is all the translator
 * ever edits.
 */
export function serializeLocaleContent(file: LocaleFile): string {
  const content = { _version: file._version, chrome: file.chrome, api: file.api };
  return JSON.stringify(content, null, 2) + '\n';
}

/**
 * Serialize the **auto-managed** half — `_hashes` (staleness) + `_obsolete`
 * (soft-deleted entries). This is processing metadata the user never edits; it's
 * written to `<code>.meta.json` beside the editable `<code>.json`.
 */
export function serializeLocaleMeta(file: LocaleFile): string {
  const meta = { _version: file._version, _hashes: file._hashes, _obsolete: file._obsolete };
  return JSON.stringify(meta, null, 2) + '\n';
}

/**
 * Recombine the editable content JSON with its (optional) sibling meta JSON into
 * one in-memory {@link LocaleFile}. A missing/absent meta file (first extract, or
 * a hand-deleted cache) parses to empty `_hashes`/`_obsolete` — the merge treats
 * those as "needs a hash", so it self-heals on the next extract. Tolerant of
 * missing blocks throughout.
 */
export function parseLocaleFiles(contentJson: string, metaJson: string | null): LocaleFile {
  const content = JSON.parse(contentJson) as Partial<LocaleFile>;
  const meta = (metaJson ? JSON.parse(metaJson) : {}) as Partial<LocaleFile>;
  return {
    _version: typeof content._version === 'number' ? content._version : LOCALE_FILE_VERSION,
    chrome: content.chrome ?? {},
    api: content.api ?? {},
    _hashes: meta._hashes ?? {},
    _obsolete: meta._obsolete ?? {},
  };
}
