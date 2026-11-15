/**
 * Apply the deploy `basePath` to the root-relative URLs in a page's MDX body for
 * the Markdown outputs (companion `.md`, `llms-full.txt`). Page bodies are
 * written base-FREE by setu and the bridges (`[x](/guide/x)`, `![d](/_assets/…)`,
 * `<SourceLink href="/source/…">`); rang prefixes them for HTML (`MdxA`/`MdxImg`/
 * …), and this is the Markdown counterpart — the base is applied exactly once
 * per output. Identity when `basePath` is the root (`'/'`, `''`, `undefined`),
 * so a root build's Markdown is byte-identical. Pure; see #377.
 *
 * Rewrites, outside code regions only (fences, `<pre>`/`<code>`, inline code —
 * example syntax must stay verbatim):
 *  - Markdown link/image destinations `](/x` (incl. `](</x`), not `](//host`;
 *  - reference definitions `[id]: /x` at line start;
 *  - `href="/x"`, `src="/x"`, `sourceHref="/x"` attributes (either quote), not `//host`,
 *    and not in a backslash-escaped tag (`\<Link href="/x">` is literal text).
 * Protocol-relative, absolute (`https:`, `data:`, `mailto:`), relative and
 * `#hash` URLs are untouched.
 */
export function prefixRootRelativeUrls(body: string, basePath: string | undefined): string {
  const prefix = (basePath ?? '/').replace(/\/+$/, '');
  if (!prefix || !body) return body;
  const out: string[] = [];
  let last = 0;
  for (const m of body.matchAll(CODE_REGION_RE)) {
    const start = m.index ?? 0;
    out.push(rewrite(body.slice(last, start), prefix), m[0]);
    last = start + m[0].length;
  }
  out.push(rewrite(body.slice(last), prefix));
  return out.join('');
}

/** Same code-region regex as the bridges' `CODE_REGION_RE` (publish.ts / docs.ts). */
const CODE_REGION_RE =
  /```[\s\S]*?```|~~~[\s\S]*?~~~|<pre[\s\S]*?<\/pre>|<code[^>]*>[\s\S]*?<\/code>|`[^`\n]+`/gi;
/** `](/x` or `](</x` — a link/image destination; `(?!\/)` keeps `//host` out. */
const MD_DEST_RE = /(\]\(<?)\/(?!\/)/g;
/** `[id]: /x` reference definition at line start (≤3 spaces indent). */
const MD_DEF_RE = /^([ \t]{0,3}\[[^\]\n]+\]:[ \t]*<?)\/(?!\/)/gm;
/**
 * `href="/x"` / `src='/x'` / `sourceHref="/x"` HTML or MDX-JSX attribute (group 2),
 * OR — matched to be left alone — an escaped tag (group 1): an opener after an
 * odd run of backslashes, `\<Link href="/x">`, with its attributes up to the
 * closing `>` (quoted values may hold `>`; an unquoted `<` ends it, and so
 * does a backslash run before one, which belongs to the next tag). setu
 * writes a tag that isn't markup as that literal text and the HTML page shows
 * it as typed, so its URL must stay as typed too. An even run (`\\<a …>`) is an
 * escaped backslash before a real tag, which gets the prefix. Linear: the
 * lookbehind lets only the start of a backslash run try the first branch, and
 * the tag-body alternatives each start with a different character.
 */
const ATTR_RE =
  /(?<!\\)((?:\\\\)*\\<[A-Za-z](?:"[^"]*"|'[^']*'|[^"'<>\\]|\\+(?=[^\\<]))*>?)|(\b(?:href|src|sourceHref)=["'])\/(?!\/)/g;

function rewrite(text: string, prefix: string): string {
  if (!text.includes('/')) return text;
  const p = `${prefix}/`;
  return text
    .replace(MD_DEST_RE, (_m, open: string) => `${open}${p}`)
    .replace(MD_DEF_RE, (_m, open: string) => `${open}${p}`)
    .replace(ATTR_RE, (m, escapedTag: string | undefined, open: string) =>
      escapedTag === undefined ? `${open}${p}` : m
    );
}
