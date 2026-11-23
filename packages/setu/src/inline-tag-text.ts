/**
 * JSDoc inline tags left as raw text, reduced to the text the page body shows
 * for them. Used where only plain text fits: a guide/doc page's derived
 * description (#370) and an API page's frontmatter description (#366).
 */

// The tags run on joined text, since autolinks and inline markup split a tag
// across nodes. The bodies exclude `{`/`}` and the labels exclude `[`/`]`, so
// every match attempt stops at the next brace or bracket and the scan stays
// linear.
const LABELLED_TAG = /\[([^[\]]*)\](\{@(?:link|linkcode|linkplain|tutorial)\s[^{}]*\})/g;
const INLINE_TAG = /\{@(link|linkcode|linkplain|tutorial)\s([^{}]*)\}/g;
/** A tag body: the target, then an optional `|` and/or whitespace and the label. */
const TAG_BODY = /^([^|\s]+)[|\s]*([\s\S]*)$/;

/**
 * Replace `{@link}` / `{@linkcode}` / `{@linkplain}` / `{@tutorial}` with their
 * display text, matching the body: the label when one is given (`[label]{@link x}`,
 * `{@link x|label}`, `{@link x label}`), else the target as written. A
 * `{@tutorial}` without a label shows the tutorial's title from `tutorialTitle`,
 * else its name. A tag with no target is left unchanged; other tags
 * (`{@inheritDoc}`) are untouched.
 */
export function inlineTagsToText(
  text: string,
  tutorialTitle?: (name: string) => string | undefined
): string {
  if (!text.includes('{@')) return text;
  return text
    .replace(LABELLED_TAG, (_all, label: string, tag: string) => label.trim() || tag)
    .replace(INLINE_TAG, (all, tag: string, body: string) => {
      const m = TAG_BODY.exec(body.trim());
      if (!m) return all;
      const [, target, label] = m;
      const shown = label.trim();
      if (shown) return shown;
      return tag === 'tutorial' ? (tutorialTitle?.(target) ?? target) : target;
    });
}
