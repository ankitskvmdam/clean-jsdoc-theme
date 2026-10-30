import { describe, it, expect } from 'vitest';
import {
  collectUsedLangs,
  escapeEsmLookalikes,
  escapeStrayBraces,
  findStrayBackticks,
  preprocessJsdocInlineTags,
  signatureParamRanges,
  stripHtmlComments,
} from '../mdx';

describe('signatureParamRanges', () => {
  /** Slice each returned range out of the source — easier to assert on. */
  const params = (sig: string): string[] =>
    signatureParamRanges(sig).map((r) => sig.slice(r.start, r.end));

  it('returns each parameter (name + type), not the function name or parens', () => {
    expect(params('reduce(query?: object, iterator: function): *')).toEqual([
      'query?: object',
      'iterator: function',
    ]);
  });

  it('keeps a generic / tuple type as one parameter (top-level commas only)', () => {
    expect(params('merge(a: Map<string, number>, b: [number, number]): void')).toEqual([
      'a: Map<string, number>',
      'b: [number, number]',
    ]);
  });

  it('handles a function-type parameter (its own parens + `=>`)', () => {
    expect(params('on(event: string, cb: (e: Event) => void): void')).toEqual([
      'event: string',
      'cb: (e: Event) => void',
    ]);
  });

  it('trims the wrap indentation (newlines / tabs) off each range', () => {
    expect(params('reduce(\n\tquery?: object,\n\titerator: function,\n): *')).toEqual([
      'query?: object',
      'iterator: function',
    ]);
  });

  it('returns [] for a paren-less signature (a field) or an empty list', () => {
    expect(signatureParamRanges('current: Widget')).toEqual([]);
    expect(signatureParamRanges('reset(): void')).toEqual([]);
  });
});

describe('collectUsedLangs', () => {
  it('always includes the common documentation languages, even with no code', () => {
    const langs = collectUsedLangs(['# Just prose, no code fences.']);
    for (const common of ['js', 'ts', 'json', 'json5', 'html', 'css']) {
      expect(langs, `expected ${common} in the base set`).toContain(common);
    }
  });

  it('adds other languages a fence actually uses, deduped', () => {
    const langs = collectUsedLangs(['```python\nx = 1\n```', '```python\ny = 2\n```']);
    expect(langs).toContain('python');
    expect(langs.filter((l) => l === 'python')).toHaveLength(1);
    expect(langs).toContain('ts'); // base set still present
  });

  it('ignores unknown / non-shiki fence languages', () => {
    const langs = collectUsedLangs(['```not-a-real-lang\nx\n```']);
    expect(langs).not.toContain('not-a-real-lang');
  });
});

describe('escapeStrayBraces', () => {
  it('escapes stray braces in prose (JSDoc namepaths / operators)', () => {
    expect(escapeStrayBraces('See {base#addOptions} for details.')).toBe(
      'See \\{base#addOptions\\} for details.'
    );
    expect(escapeStrayBraces('Matches {$gt: 1}.')).toBe('Matches \\{$gt: 1\\}.');
  });

  it('leaves braces inside inline code spans untouched', () => {
    expect(escapeStrayBraces('use `{ a: 1 }` here')).toBe('use `{ a: 1 }` here');
  });

  it('leaves braces inside MDX JSX attribute values untouched (signature object types)', () => {
    // setu emits signatures as JSX attributes; an object-type return like
    // `{ radius: number }` is a literal attribute string, not an MDX expression.
    const src = '<Signature code="scale(options: { radius: number }): Circle" />';
    expect(escapeStrayBraces(src)).toBe(src);
    // A generic signature carries `<`/`>` inside the quoted value — still one tag.
    const generic = '<MemberHeading id="emit" depth="3" name="emit" sig="emit<T>(): { ok: T }" />';
    expect(escapeStrayBraces(generic)).toBe(generic);
    // …but a stray brace in the prose AROUND a tag is still escaped.
    expect(escapeStrayBraces('text {x} <Signature code="f(): { y: T }" /> {z}')).toBe(
      'text \\{x\\} <Signature code="f(): { y: T }" /> \\{z\\}'
    );
  });

  it('leaves braces inside fenced code blocks untouched', () => {
    const src = 'text {x}\n```js\nconst o = { a: 1 };\n```\nmore {y}';
    const out = escapeStrayBraces(src);
    expect(out).toContain('const o = { a: 1 };'); // fence body unchanged
    expect(out).toContain('text \\{x\\}');
    expect(out).toContain('more \\{y\\}');
  });

  it('leaves YAML frontmatter untouched', () => {
    const src = '---\ntitle: a {b} c\n---\n\nbody {z}';
    const out = escapeStrayBraces(src);
    expect(out).toContain('title: a {b} c'); // frontmatter value unescaped
    expect(out).toContain('body \\{z\\}');
  });

  it('protects the code spans that the inline-tag pass produces', () => {
    // `{@link base#x}` → inline code, then a bare `{base#y}` gets escaped.
    const out = escapeStrayBraces(preprocessJsdocInlineTags('{@link base#x} and {base#y}'));
    expect(out).toBe('`@link base#x` and \\{base#y\\}');
  });

  it('allows a code span to cross a single line break', () => {
    // CommonMark code spans may span lines — just not a blank line.
    const out = escapeStrayBraces('a `code {x}\nmore {y}` b');
    expect(out).toBe('a `code {x}\nmore {y}` b'); // braces inside the span untouched
  });

  it('does not let an unbalanced backtick swallow a later brace across a blank line', () => {
    // issue #333 / dwv: an odd backtick run desyncs naive pairing. The stray
    // backtick on the first line has no equal-length partner before the blank
    // line, so it stays literal and the brace in the next paragraph is escaped.
    const out = escapeStrayBraces('open `unclosed tick\n\nlater {x: 1} brace');
    expect(out).toContain('later \\{x: 1\\} brace');
  });

  it('reproduces the dwv splitKeyValueString shape: braces escape past a stray tick', () => {
    // The real failure: line 1 opens a backtick that pairs with the FIRST tick on
    // line 2 (single line break, allowed); the SECOND tick on line 2 is then a
    // lone tick. Across the following blank line, a separate comment's object
    // example must still be escaped, not swallowed as code.
    const src = [
      'Split key/value string: `key0=val00&key0=val01&key1=val10',
      '  will return `{key0 : [val00, val01], key1 : val1}`.',
      '',
      'returns { base : root, query : [ key0 : [val00] ] }',
    ].join('\n');
    const out = escapeStrayBraces(src);
    // The object example after the blank line is escaped (would otherwise be an
    // MDX expression → acorn failure).
    expect(out).toContain('returns \\{ base : root, query : [ key0 : [val00] ] \\}');
  });

  it('treats a longer backtick run inside a span as content, not a premature close', () => {
    // The ``` is literal content of the `…` span; a brace OUTSIDE still escapes.
    expect(escapeStrayBraces('see ` ```x ` then {y}')).toBe('see ` ```x ` then \\{y\\}');
  });

  it('ignores a backslash-escaped backtick (literal, not a span opener)', () => {
    // `\`` is a literal backtick, so it does not open a span — the {y} still escapes.
    expect(escapeStrayBraces('a \\` then {y}')).toBe('a \\` then \\{y\\}');
  });
});

describe('findStrayBackticks', () => {
  it('finds nothing in well-balanced prose', () => {
    expect(findStrayBackticks('use `foo` and `bar` here')).toEqual([]);
    expect(findStrayBackticks('no code at all, just prose')).toEqual([]);
  });

  it('flags an unbalanced backtick with its 1-based line/column', () => {
    const stray = findStrayBackticks('line one\nopen `unclosed here\n\nnext para');
    expect(stray).toHaveLength(1);
    expect(stray[0].line).toBe(2);
    expect(stray[0].column).toBe(6); // the backtick after "open "
    expect(stray[0].lineText).toBe('open `unclosed here');
  });

  it('does not flag a span that legitimately crosses a single line break', () => {
    expect(findStrayBackticks('a `code\nmore` b')).toEqual([]);
  });

  it('ignores backticks inside fenced code blocks and frontmatter', () => {
    const src = '---\ntag: `x\n---\n\n```\nlone ` inside fence\n```\n\nclean prose';
    expect(findStrayBackticks(src)).toEqual([]);
  });

  it('does NOT flag a longer backtick run inside a code span (CommonMark)', () => {
    // Regression: `` ` ```iframe ` `` is a valid single-backtick span whose content
    // is the literal ```iframe — the inner ``` must not be read as a premature
    // closer that leaves dangling backticks (the markdown-examples tutorial case).
    expect(findStrayBackticks('Use an ` ```iframe ` fenced block')).toEqual([]);
    // A double-backtick span containing a single backtick is also balanced.
    expect(findStrayBackticks('the `` ` `` character')).toEqual([]);
  });

  it('ignores backslash-escaped backticks (literal, not delimiters)', () => {
    // e.g. a table cell that displays the backtick character, or a trailing
    // escaped backtick after a balanced span — neither is a real delimiter.
    expect(findStrayBackticks('| Backtick | \\` |')).toEqual([]);
    expect(findStrayBackticks('span `x` then a literal \\` backtick')).toEqual([]);
  });

  it('flags the orphan tick in the dwv splitKeyValueString shape', () => {
    // `A` (line 1) pairs with the first tick on line 2; the second tick on line 2
    // is the orphan that desynced everything downstream.
    const src = [
      'Split key/value string: `key0=val00&key0=val01&key1=val10',
      '  will return `{key0 : [val00, val01], key1 : val1}`.',
    ].join('\n');
    const stray = findStrayBackticks(src);
    expect(stray).toHaveLength(1);
    expect(stray[0].line).toBe(2);
  });
});

// issue #347: MDX reads a flow line that starts with `import `/`export ` as an
// ES module statement, so a doc-comment description beginning with that word
// aborted its page. The pre-pass turns the keyword's first letter into a
// character reference (invisible once rendered) everywhere it is prose.
describe('escapeEsmLookalikes (issue #347)', () => {
  const IMPORT = 'import these functions to your own project.';
  const EXPORT = 'export the result when you are done.';

  it('escapes a paragraph that starts with lowercase "import"', () => {
    expect(escapeEsmLookalikes(`${IMPORT}\n`)).toBe(
      `&#x69;mport these functions to your own project.\n`
    );
  });

  it('escapes a paragraph that starts with lowercase "export"', () => {
    expect(escapeEsmLookalikes(`${EXPORT}\n`)).toBe(`&#x65;xport the result when you are done.\n`);
  });

  it('escapes "export default …" prose (the construct keys on the keyword alone)', () => {
    expect(escapeEsmLookalikes('export default behaviour is to copy.\n')).toBe(
      '&#x65;xport default behaviour is to copy.\n'
    );
  });

  it('escapes a later paragraph, not just the first block of the page', () => {
    expect(escapeEsmLookalikes(`# Page\n\nUse this module.\n\n${IMPORT}\n`)).toBe(
      `# Page\n\nUse this module.\n\n&#x69;mport these functions to your own project.\n`
    );
  });

  it('escapes the first line right after the YAML frontmatter, leaving the frontmatter alone', () => {
    const fm = '---\ntitle: foo\nimport: not-a-keyword\n---\n';
    expect(escapeEsmLookalikes(`${fm}\n${IMPORT}\n`)).toBe(
      `${fm}\n&#x69;mport these functions to your own project.\n`
    );
  });

  it('escapes the keyword in the shape setu emits for a module page', () => {
    const body = [
      '# foo',
      '',
      '<SourceLink href="/source/main-js/#L5" label="main.js:5" />',
      '',
      IMPORT,
      '',
    ].join('\n');
    const out = escapeEsmLookalikes(body);
    expect(out).toContain('<SourceLink href="/source/main-js/#L5" label="main.js:5" />');
    expect(out).toContain('&#x69;mport these functions');
    expect(out).not.toMatch(/^import\s/m);
  });

  it('leaves a capitalized "Import …" line alone (the reporter\'s workaround)', () => {
    const src = 'Import these functions to your own project.\n';
    expect(escapeEsmLookalikes(src)).toBe(src);
  });

  it('leaves words that merely begin with import/export alone', () => {
    const src = [
      'important: read this first.',
      '',
      'imports are resolved lazily.',
      '',
      'imported symbols are cached.',
      '',
      'exports are frozen after init.',
      '',
      'import, then use it.',
      '',
    ].join('\n');
    expect(escapeEsmLookalikes(src)).toBe(src);
  });

  it('leaves a mid-line, indented, listed, or quoted import/export alone', () => {
    const src = [
      'You can import these functions and export the result.',
      '',
      '  import indented is never ESM.',
      '',
      '- import inside a list item.',
      '',
      '> export inside a quote.',
      '',
    ].join('\n');
    expect(escapeEsmLookalikes(src)).toBe(src);
  });

  it('also escapes a column-0 continuation line (harmless — it renders the same letter)', () => {
    // A lazy continuation line is not ESM, but telling it apart from a flow
    // line that follows a JSX element (which IS ESM) would need a block parser.
    // The reference decodes to the plain letter either way, so over-escaping
    // is invisible — the pass stays a line-level rewrite.
    expect(escapeEsmLookalikes('Use this module.\nimport it anywhere.\n')).toBe(
      'Use this module.\n&#x69;mport it anywhere.\n'
    );
  });

  it('leaves a real import statement inside a fenced code block alone', () => {
    const src =
      '# Page\n\n```js\nimport x from "y";\nexport default x;\n```\n\n~~~ts\nexport const a = 1;\n~~~\n';
    expect(escapeEsmLookalikes(src)).toBe(src);
  });

  it('leaves a keyword inside an inline code span that crosses a line break alone', () => {
    const src = 'Call `foo(\nimport)` here.\n';
    expect(escapeEsmLookalikes(src)).toBe(src);
  });

  it('leaves the keyword alone inside a multi-line MDX JSX tag', () => {
    const src = '<Signature code="\nimport x" />\n';
    expect(escapeEsmLookalikes(src)).toBe(src);
  });

  it('still escapes prose after a fence closes', () => {
    const src = '```js\nimport x from "y";\n```\n\nimport it like above.\n';
    expect(escapeEsmLookalikes(src)).toBe(
      '```js\nimport x from "y";\n```\n\n&#x69;mport it like above.\n'
    );
  });

  it('composes with the brace pass without disturbing it', () => {
    const src = `${IMPORT} Pass {opts}.\n`;
    expect(escapeStrayBraces(escapeEsmLookalikes(src))).toBe(
      '&#x69;mport these functions to your own project. Pass \\{opts\\}.\n'
    );
  });
});

// MDX has no HTML-comment syntax: `<!--` reads as a JSX tag whose name starts
// with `!`, so one comment anywhere in prose (a README badge block, an
// all-contributors marker, a note in a doc comment) aborted the whole page.
// The pre-pass drops comments from prose and leaves code alone.
describe('stripHtmlComments', () => {
  it('drops a comment on its own line, leaving the line blank', () => {
    expect(stripHtmlComments('# Tutorial\n\n<!-- a comment -->\n\nimport it.\n')).toBe(
      '# Tutorial\n\n\n\nimport it.\n'
    );
  });

  it('drops a comment in the middle of a sentence (the doc-comment repro)', () => {
    expect(
      stripHtmlComments('HTML comment in a description <!-- internal note -->should not break.\n')
    ).toBe('HTML comment in a description should not break.\n');
  });

  it('drops a comment directly adjacent to text on both sides', () => {
    expect(stripHtmlComments('before<!--x-->after\n')).toBe('beforeafter\n');
  });

  it('drops several comments on one line', () => {
    expect(stripHtmlComments('a <!-- x --> b <!-- y --> c <!--z-->\n')).toBe('a  b  c \n');
  });

  it('drops a multi-line comment, including one that spans a blank line', () => {
    expect(stripHtmlComments('a\n\n<!--\nline one\n\nline two\n-->\n\nb\n')).toBe('a\n\n\n\nb\n');
  });

  it('drops all-contributors style START/END marker pairs but keeps what they wrap', () => {
    const src = [
      '<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->',
      '<!-- prettier-ignore-start -->',
      '',
      '| Contributor |',
      '| - |',
      '| x |',
      '',
      '<!-- prettier-ignore-end -->',
      '<!-- ALL-CONTRIBUTORS-LIST:END -->',
      '',
    ].join('\n');
    const out = stripHtmlComments(src);
    expect(out).not.toContain('<!--');
    expect(out).toContain('| Contributor |\n| - |\n| x |');
  });

  it('drops a comment inside an HTML block (README `<p align="center">` header)', () => {
    const src = '<p align="center">\n  <!-- logo -->\n  <img src="logo.png" />\n</p>\n';
    expect(stripHtmlComments(src)).toBe('<p align="center">\n  \n  <img src="logo.png" />\n</p>\n');
  });

  it('drops a comment that is the first body line after the frontmatter, keeping the frontmatter', () => {
    const fm = '---\ntitle: Home\nnote: "<!-- not a comment, YAML -->"\n---\n';
    expect(stripHtmlComments(`${fm}<!-- badges -->\n[![npm](x.svg)](y)\n`)).toBe(
      `${fm}\n[![npm](x.svg)](y)\n`
    );
  });

  it('drops the CommonMark empty forms <!----> , <!--> and <!--->', () => {
    expect(stripHtmlComments('a<!---->b <!-->c <!--->d\n')).toBe('ab c d\n');
  });

  it('ends a comment at the first -->', () => {
    expect(stripHtmlComments('<!-- a --> shown <!-- b -->\n')).toBe(' shown \n');
  });

  it('leaves comments inside fenced code blocks verbatim', () => {
    const src = '```html\n<!-- keep me -->\n<p>x</p>\n```\n\n~~~md\n<!-- and me -->\n~~~\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('leaves comments inside inline code spans verbatim, even across a line break', () => {
    const src = 'Write `<!-- x -->` or ``<!--\ny -->`` to hide text.\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('leaves a comment inside an MDX JSX attribute alone', () => {
    const src = '<Signature code="html(): \'<!-- x -->\'" />\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('leaves a backslash-escaped opener alone (it is literal text already)', () => {
    const src = 'Type \\<!-- to open a comment.\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('escapes an unterminated <!-- instead of swallowing the rest of the page', () => {
    expect(stripHtmlComments('a <!-- oops\n\n## Later\n\nstill here\n')).toBe(
      'a \\<!-- oops\n\n## Later\n\nstill here\n'
    );
  });

  it('pairs an opener with the first --> (HTML semantics), escaping only a trailing unterminated one', () => {
    expect(stripHtmlComments('<!-- a --> b <!-- c\n')).toBe(' b \\<!-- c\n');
  });

  it('leaves a --> with no opener alone (> is not special to MDX)', () => {
    const src = 'a --> b\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('leaves a body without comments byte-identical', () => {
    const src = '# Page\n\nSome <b>bold</b> text, `code`, and a -> b.\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('runs before the ESM pass, so a line exposed by a dropped comment is still neutralized', () => {
    const out = escapeEsmLookalikes(stripHtmlComments('<!-- note -->import it first.\n'));
    expect(out).toBe('&#x69;mport it first.\n');
  });

  it('hides a backtick inside a comment from findStrayBackticks', () => {
    expect(findStrayBackticks('text <!-- use `foo here -->\n\nmore\n')).toEqual([]);
  });

  it('still reports a stray backtick outside a comment', () => {
    expect(findStrayBackticks('<!-- note -->\n\nPass `x to it.\n')).toHaveLength(1);
  });

  it('keeps a comment shown inside a ```` fence that wraps ``` lines (setu emits these)', () => {
    const src = 'Intro\n\n````md\n```html\n<!-- kept -->\n```\n````\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('keeps code/prose parity after a fence holding an odd number of ``` lines', () => {
    const src = '````md\n```js\n````\n\nText <!-- c --> after.\n\n```js\n<!-- x -->\n```\n';
    expect(stripHtmlComments(src)).toBe(
      '````md\n```js\n````\n\nText  after.\n\n```js\n<!-- x -->\n```\n'
    );
  });

  it('keeps a comment that is part of a link destination or title', () => {
    const src = '[a](http://x/<!--y-->z) and ![a](x.png "t <!-- c --> d")\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('drops a comment after escaped brackets (no link, so nothing protects it)', () => {
    expect(stripHtmlComments('\\[a\\](http://x/<!--y-->z) more\n')).toBe(
      '\\[a\\](http://x/z) more\n'
    );
  });

  it('does not open a fence on a lone fence line inside a comment block', () => {
    expect(stripHtmlComments('<!--\n```js\n-->\n\nText <!-- c --> after.\n')).toBe(
      '\n\nText  after.\n'
    );
  });

  it('does not let an inline comment run across a heading', () => {
    expect(stripHtmlComments('text <!-- a\n# Heading\n-->\n')).toBe(
      'text \\<!-- a\n# Heading\n-->\n'
    );
  });

  it('does not let an unterminated inline opener swallow a following fence', () => {
    const src = 'a <!-- b\n\n```html\n<!-- x -->\n```\n\nafter\n';
    expect(stripHtmlComments(src)).toBe('a \\<!-- b\n\n```html\n<!-- x -->\n```\n\nafter\n');
  });

  it('drops a line-starting comment that wraps a whole section, code block included', () => {
    const src = 'Keep.\n\n<!--\n## Old\n\n```js\nold();\n```\n-->\n\nAlso keep.\n';
    expect(stripHtmlComments(src)).toBe('Keep.\n\n\n\nAlso keep.\n');
  });
});
