import { defaultHandlers, type Options } from 'hast-util-to-mdast';
import type { Code } from 'mdast';

/** A `hast-util-to-mdast` element handler. */
type Handle = NonNullable<NonNullable<Options['handlers']>[string]>;
/** A hast element (typed through the handler, as setu has no direct `hast` dependency). */
type Element = Parameters<Handle>[1];

/** `lang-js` (JSDoc's markdown plugin, prettify) or `language-js` (CommonMark). */
const LANGUAGE_CLASS = /^lang(?:uage)?-(.+)$/;

/** The language named by the first `lang-*` / `language-*` class of `node`, verbatim. */
function classLanguage(node: Element): string | undefined {
  const classes = node.properties?.className;
  if (!Array.isArray(classes)) return undefined;
  for (const name of classes) {
    const match = LANGUAGE_CLASS.exec(String(name));
    if (match) return match[1];
  }
  return undefined;
}

/**
 * `<pre>` → code, as the default handler does, but also reading the language
 * from a `lang-*` class (#359). JSDoc's markdown plugin renders ```` ```js ````
 * as `<pre class="prettyprint source lang-js"><code>`: the language sits on the
 * `<pre>`, where the default handler (which reads only `language-*` on the
 * `<code>`) never looks. The default result wins whenever it has a language;
 * otherwise the `<pre>`'s class, then its first `<code>` child's.
 */
const pre: Handle = (state, node) => {
  const result = defaultHandlers.pre(state, node) as Code;
  if (result.lang) return result;
  const inner = node.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code'
  );
  const lang = classLanguage(node) ?? (inner && classLanguage(inner));
  if (lang) result.lang = lang;
  return result;
};

/** `hast-util-to-mdast` handlers that keep a code block's language. */
export const codeLanguageHandlers: Record<string, Handle> = { pre };
