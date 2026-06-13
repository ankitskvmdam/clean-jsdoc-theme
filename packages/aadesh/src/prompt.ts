/**
 * Build the LLM translation prompt (the plan §3 `aadesh prompt`): the new +
 * stale keys for a locale, an exact return-JSON shape, instructions to preserve
 * markdown / `{@link}` / code fences / `{var}` tokens, chunked for context
 * limits. Pure + deterministic — the command layer reads files and prints these.
 */

import { flattenLocaleFile, type LocaleFile, type Template } from './locale';

/** One entry the LLM should translate: untranslated (new) or source-drifted (stale). */
export interface PromptItem {
  /** Full flat key (`chrome.*` / `api.*`). */
  key: string;
  /** The default-locale source text to translate. */
  source: string;
  /** The existing (now stale) translation, given as revision context. */
  current?: string;
  /** True when a translation exists but its source changed (revise, don't start over). */
  stale: boolean;
}

/**
 * Collect the keys a locale still needs work on, in template order: untranslated
 * (empty value) and stale (a non-empty value whose tracked hash no longer matches
 * the template's). An up-to-date translation is omitted.
 */
export function collectTranslatable(template: Template, file: LocaleFile): PromptItem[] {
  const flat = flattenLocaleFile(file);
  const out: PromptItem[] = [];
  for (const t of template) {
    const entry = flat.get(t.key);
    const value = entry?.value ?? '';
    if (value === '') {
      out.push({ key: t.key, source: t.source, stale: false });
    } else if (entry!.hash !== t.hash) {
      out.push({ key: t.key, source: t.source, current: value, stale: true });
    }
  }
  return out;
}

/** Default number of entries per prompt chunk (kept modest for context limits). */
export const DEFAULT_CHUNK_SIZE = 40;

export interface BuildPromptsOptions {
  /** Locale code being translated to. */
  locale: string;
  /** Optional display name for the locale (e.g. "Français"). */
  name?: string;
  /** The items to translate (from {@link collectTranslatable}). */
  items: PromptItem[];
  /** Entries per chunk; defaults to {@link DEFAULT_CHUNK_SIZE}. */
  chunkSize?: number;
}

/** The fixed instruction preamble — the translator contract (markdown/tags/tokens). */
function preamble(label: string): string {
  return [
    `You are a professional software-documentation translator. Translate the`,
    `"source" of each entry below into ${label}.`,
    ``,
    `Rules:`,
    `- Preserve all Markdown and HTML structure exactly (tags, lists, tables, links).`,
    `- Do NOT translate or alter: \`{@link ...}\` / \`{@linkcode ...}\` / \`{@linkplain ...}\``,
    `  tags, code inside backticks or fenced \`\`\` blocks, URLs, or HTML attributes.`,
    `- Keep every \`{token}\` interpolation placeholder verbatim (e.g. \`{count}\`) — do`,
    `  not translate, rename, drop, or add one.`,
    `- Translate only human-readable prose.`,
    `- Where a "current" translation is given, the source changed — revise it.`,
    ``,
    `Return ONLY a JSON object mapping each key to its translation, nothing else:`,
    `{ "<key>": "<translation>", ... }`,
  ].join('\n');
}

/** Render one chunk's entries as the `{ key: { source, current? } }` JSON block. */
function entriesBlock(items: PromptItem[]): string {
  const obj: Record<string, { source: string; current?: string }> = {};
  for (const item of items) {
    obj[item.key] =
      item.current !== undefined
        ? { source: item.source, current: item.current }
        : { source: item.source };
  }
  return JSON.stringify(obj, null, 2);
}

/**
 * Build one self-contained prompt per chunk (preamble + entries). Returns `[]`
 * when there's nothing to translate.
 */
export function buildPrompts(opts: BuildPromptsOptions): string[] {
  if (opts.items.length === 0) return [];
  const size = opts.chunkSize && opts.chunkSize > 0 ? opts.chunkSize : DEFAULT_CHUNK_SIZE;
  const label = opts.name ? `${opts.name} (${opts.locale})` : opts.locale;

  const chunks: PromptItem[][] = [];
  for (let i = 0; i < opts.items.length; i += size) chunks.push(opts.items.slice(i, i + size));

  return chunks.map((chunk, i) =>
    [
      `# Translate to ${label} — chunk ${i + 1}/${chunks.length}`,
      ``,
      preamble(label),
      ``,
      `Entries:`,
      entriesBlock(chunk),
    ].join('\n')
  );
}
