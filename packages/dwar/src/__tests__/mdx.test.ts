import { describe, it, expect } from 'vitest';
import { mdxCodeRanges } from '@clean-jsdoc-theme/utils';
import {
  collectUsedLangs,
  escapeEsmLookalikes,
  escapeStrayBraces,
  findStrayBackticks,
  pageCommentRanges,
  preprocessJsdocInlineTags,
  signatureParamRanges,
  stripHtmlComments,
} from '../mdx';
import { expectLinearScaling, PERF_TEST_TIMEOUT } from './linear-scaling';

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

  it('leaves braces inside a single-quoted JSX attribute alone', () => {
    expect(escapeStrayBraces("<img alt='{x}' />")).toBe("<img alt='{x}' />");
  });

  it('escapes braces in a backslash-escaped tag (literal text, not JSX)', () => {
    // setu's text for a non-markup tag in prose, e.g. `<Foo bar="{x}">c</Foo>`.
    expect(escapeStrayBraces('a \\<Foo bar="{x}">c\\</Foo> d')).toBe(
      'a \\<Foo bar="\\{x\\}">c\\</Foo> d'
    );
    // A real JSX tag right after it is still protected.
    expect(escapeStrayBraces('\\<T> <Signature code="{ y }" />')).toBe(
      '\\<T> <Signature code="{ y }" />'
    );
  });

  it("empties the comment placeholders, so an image's alt picks up none of them (#380)", () => {
    expect(escapeStrayBraces('a {/**/} b')).toBe('a {} b');
    // A placeholder wrapping a newline keeps it, with its prefix: same line count.
    expect(escapeStrayBraces('a {/*\n> */}{/*\n  */} b')).toBe('a {\n> }{\n  } b');
    // Only outside code and JSX tags; a user's own `{x}` is still escaped.
    expect(escapeStrayBraces('`{/**/}` {/**/} {x}')).toBe('`{/**/}` {} \\{x\\}');
    expect(escapeStrayBraces('```\n{/**/}\n```\n')).toBe('```\n{/**/}\n```\n');
    expect(escapeStrayBraces('<X a="{/**/}" />')).toBe('<X a="{/**/}" />');
    // After the empty fragment that ends a bare URL.
    expect(escapeStrayBraces('https://x<></>{/**/}')).toBe('https://x<></>{}');
  });
});

describe('preprocessJsdocInlineTags (#363)', () => {
  const p = preprocessJsdocInlineTags;

  describe('leaves a tag inside code as written', () => {
    it.each<[string, string]>([
      ['an @example line', '```js\n// shows a tag: {@link Foo}\nconst doc = "{@link Foo}";\n```\n'],
      ['a ~~~ fence', '~~~\n{@link Foo}\n~~~\n'],
      ['a ```` fence around ``` lines', '````md\n```js\n{@link Foo}\n```\n{@link Bar}\n````\n'],
      ['an unclosed fence', 'text\n\n```js\n{@link Foo}\n'],
      ['a code span holding only the tag', 'see `{@link Foo}` here'],
      ['a code span with text around the tag', 'a `see {@link Foo} here` b'],
      ['a JSX attribute value', '<Callout title="{@link Foo}">\n\nbody\n\n</Callout>\n'],
    ])('in %s', (_name, src) => {
      expect(p(src)).toBe(src);
    });

    it('in the frontmatter, while a tag in the body below is still rewritten', () => {
      expect(p('---\ntitle: "{@link Foo}"\n---\n\nsee {@link Bar}\n')).toBe(
        '---\ntitle: "{@link Foo}"\n---\n\nsee `@link Bar`\n'
      );
    });

    it('in code, while a prose tag on the same page is still rewritten', () => {
      expect(p('see {@link A}\n\n```js\n{@link B}\n```\n\nand `{@link C}` or {@link D}')).toBe(
        'see `@link A`\n\n```js\n{@link B}\n```\n\nand `{@link C}` or `@link D`'
      );
    });
  });

  describe('rewrites a prose tag as before', () => {
    it.each<[string, string, string]>([
      [
        'two tags',
        'see {@link Foo} and {@link Bar|label}',
        'see `@link Foo` and `@link Bar|label`',
      ],
      ['a tag wrapped across a line break', 'see {@link Foo\nBar} end', 'see `@link Foo\nBar` end'],
      ['a tag in a list item', '- see {@link Foo}\n', '- see `@link Foo`\n'],
      ['a tag in a quote', '> see {@link Foo}\n', '> see `@link Foo`\n'],
      ['a tag with trailing space', 'see {@link Foo } end', 'see `@link Foo` end'],
    ])('for %s', (_name, src, want) => {
      expect(p(src)).toBe(want);
    });
  });

  describe('picks a delimiter the text cannot close', () => {
    it.each<[string, string, string]>([
      ['one backtick', '{@link a`b}', '``@link a`b``'],
      ['one- and two-backtick runs', '{@link a`b``c}', '```@link a`b``c```'],
      ['text ending in a backtick', '{@link a`}', '`` @link a` ``'],
      ['a whole code span in the tag', '{@link `Foo` label}', '``@link `Foo` label``'],
      ['a stray backtick earlier in the paragraph', 'a ` b {@link Foo} c', 'a ` b ``@link Foo`` c'],
    ])('for %s', (_name, src, want) => {
      expect(p(src)).toBe(want);
    });
  });

  describe('keeps a tag apart from a neighbouring code span', () => {
    it.each<[string, string, string]>([
      ['a span before it', '`a`{@link b}', '`a`{/**/}`@link b`'],
      ['a span after it', '{@link b}`a`', '`@link b`{/**/}`a`'],
      ['another tag', '{@a}{@b}', '`@a`{/**/}`@b`'],
    ])('for %s', (_name, src, want) => {
      expect(p(src)).toBe(want);
    });

    it('leaves an empty expression between them after the brace pass', () => {
      expect(escapeStrayBraces(p('`a`{@link b}'))).toBe('`a`{}`@link b`');
      expect(escapeStrayBraces(p('{@a}{@b}'))).toBe('`@a`{}`@b`');
    });
  });

  describe('leaves a tag as written when no single code span can hold it', () => {
    it.each<[string, string]>([
      ['an escaped brace', '\\{@link Foo}'],
      ['a tag across a blank line', 'a {@link Foo\n\nBar} b'],
      ['a tag across a heading line', 'a {@link Foo\n# Bar} b'],
      ['a tag across a list-item line', 'a {@link Foo\n- Bar} b'],
      ['a multi-line tag at a line start needing three backticks', '{@link a\nb``c}'],
      ['a tag ending inside a later code span', 'a {@link Foo `x} y` z'],
    ])('for %s', (_name, src) => {
      expect(p(src)).toBe(src);
    });

    it('while another tag on the page is still rewritten', () => {
      expect(p('a {@link Foo\n\nBar} b\n\nsee {@link Baz}\n')).toBe(
        'a {@link Foo\n\nBar} b\n\nsee `@link Baz`\n'
      );
      expect(p('| a | b |\n|---|---|\n| {@link x|y} | c |\n\nsee {@link Foo}\n')).toBe(
        '| a | b |\n|---|---|\n| {@link x|y} | c |\n\nsee `@link Foo`\n'
      );
    });

    it('and the brace pass then shows it as literal text', () => {
      expect(escapeStrayBraces(p('a {@link Foo\n\nBar} b'))).toBe('a \\{@link Foo\n\nBar\\} b');
    });
  });

  // The pass only turns prose into code: every code range of the input that no
  // rewritten tag covers is still there (shifted) after it, and each rewritten
  // tag is exactly one code span.
  it('keeps every other code range and makes each rewritten tag one span (seeded)', () => {
    const pieces = [
      'word ',
      ' ',
      '\n',
      '\n',
      '\n\n',
      '`',
      '``',
      '{@link a}',
      '{@link a`b}',
      '{@link `c` d}',
      '{@x ',
      '}',
      '{',
      '|',
      '| a | b |\n|---|---|\n',
      '- ',
      '> ',
      '# ',
      '```\n',
      '~~~\n',
      '<X a="{@link q}" />',
      '<b>',
      '\\',
      'x`',
      '<x1/>',
    ];
    let seed = 363;
    const next = (k: number): number => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed % k;
    };
    let rewritten = 0;
    for (let n = 0; n < 20_000; n++) {
      let s = '';
      for (let len = 1 + next(20); len > 0; len--) s += pieces[next(pieces.length)];
      const out = p(s);
      const { spans, shift } = alignRewrites(s, out);
      rewritten += spans.length;
      const want = [
        ...mdxCodeRanges(s)
          .code.filter((r) => !spans.some((t) => r.start >= t.from && r.start < t.to))
          .map((r) => ({
            start: shift(r.start),
            end: shift(r.start) + r.end - r.start,
            kind: r.kind,
          })),
        ...spans.map((t) => ({ start: t.start, end: t.end, kind: 'span' as const })),
      ].sort((a, b) => a.start - b.start);
      expect(mdxCodeRanges(out).code, JSON.stringify(s)).toEqual(want);
    }
    expect(rewritten).toBeGreaterThan(1000);
  });

  /**
   * Lines `out` up with `src`, where `out` is `src` with some `{@…}` tags each
   * replaced by one code span (an empty `{/**\/}` comment may stand on either
   * side): the input extent (`from`, `to`) and output span (`start`, `end`) of
   * each, and a map from an input offset outside them to the output.
   */
  function alignRewrites(
    src: string,
    out: string
  ): {
    spans: { from: number; to: number; start: number; end: number }[];
    shift: (pos: number) => number;
  } {
    const spans: { from: number; to: number; start: number; end: number }[] = [];
    const map: number[] = [];
    const where = (): string => `${JSON.stringify(src)} → ${JSON.stringify(out)}`;
    let i = 0;
    let j = 0;
    while (i < src.length) {
      // A rewritten tag starts with its span's backticks, or the comment before it.
      if (src.startsWith('{@', i)) {
        let k = j;
        if (out.startsWith('{/**/}', k)) k += 6;
        if (out[k] === '`') {
          const to = src.indexOf('}', i) + 1;
          const text = src.slice(i + 1, to - 1).trim();
          let n = 0;
          while (out[k + n] === '`') n++;
          const ticks = '`'.repeat(n);
          const pad = text.endsWith('`') ? ' ' : '';
          const span = ticks + pad + text + pad + ticks;
          expect(out.startsWith(span, k), where()).toBe(true);
          spans.push({ from: i, to, start: k, end: k + span.length });
          i = to;
          j = k + span.length;
          // The comment after a span that a backtick follows.
          if (src[i] === '`' && out.startsWith('{/**/}', j)) j += 6;
          continue;
        }
      }
      expect(out[j], where()).toBe(src[i]);
      map[i++] = j++;
    }
    expect(j, where()).toBe(out.length);
    return { spans, shift: (pos) => map[pos] };
  }
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

  // Comments are blanked out before tokenizing (the compiled page holds none).
  it('does not pair a backtick inside a comment with one outside (false warning)', () => {
    expect(findStrayBackticks('<!-- ` --> see `code` here\n')).toEqual([]);
  });

  it('reports a backtick left unbalanced once a comment is gone (missed warning)', () => {
    const out = findStrayBackticks('text <!-- use `foo --> and `bar here\n\nmore\n');
    expect(out).toEqual([
      { line: 1, column: 28, lineText: 'text <!-- use `foo --> and `bar here' },
    ]);
  });

  it('reports the column in the original line even after a comment on that line', () => {
    expect(findStrayBackticks('a <!-- x --> `b\n\nc\n')).toEqual([
      { line: 1, column: 14, lineText: 'a <!-- x --> `b' },
    ]);
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

  it('does not rewrite an import keyword inside a single-quoted attribute spanning lines', () => {
    const src = "<a title='x\nimport y' />\n";
    expect(escapeEsmLookalikes(src)).toBe(src);
  });
});

// MDX has no HTML-comment syntax: `<!--` reads as a JSX tag whose name starts
// with `!`, so one comment anywhere in prose (a README badge block, an
// all-contributors marker, a note in a doc comment) aborted the whole page.
// The pre-pass drops comments from prose and leaves code alone.
describe('stripHtmlComments', () => {
  it('replaces a comment on its own line with an empty comment expression', () => {
    expect(stripHtmlComments('# Tutorial\n\n<!-- a comment -->\n\nimport it.\n')).toBe(
      '# Tutorial\n\n{/**/}\n\nimport it.\n'
    );
  });

  it('drops a comment in the middle of a sentence (the doc-comment repro)', () => {
    expect(
      stripHtmlComments('HTML comment in a description <!-- internal note -->should not break.\n')
    ).toBe('HTML comment in a description {/**/}should not break.\n');
  });

  it('drops a comment directly adjacent to text on both sides', () => {
    expect(stripHtmlComments('before<!--x-->after\n')).toBe('before{/**/}after\n');
  });

  it('drops several comments on one line', () => {
    expect(stripHtmlComments('a <!-- x --> b <!-- y --> c <!--z-->\n')).toBe(
      'a {/**/} b {/**/} c {/**/}\n'
    );
  });

  it('keeps the inline syntax on either side of a dropped comment apart', () => {
    // Dropped without a trace, these would join: one code span "a``b", one
    // reference link [a][b], or a run of seven backticks opening a fence.
    expect(stripHtmlComments('`a`<!-- x -->`b`\n')).toBe('`a`{/**/}`b`\n');
    expect(stripHtmlComments('[a]<!-- x -->[b]\n')).toBe('[a]{/**/}[b]\n');
    expect(stripHtmlComments('```<!-- x -->```` x\n')).toBe('```{/**/}```` x\n');
  });

  it('ends a bare URL where a comment glued to it stood', () => {
    // GFM's autolink literal would take the placeholder as part of the URL;
    // an empty fragment ends it, as the comment's `<` does on GitHub.
    expect(stripHtmlComments('See https://example.com/docs<!-- TODO -->.\n')).toBe(
      'See https://example.com/docs<></>{/**/}.\n'
    );
    expect(stripHtmlComments('www.x.org<!-- a --><!-- b -->/y\n')).toBe(
      'www.x.org<></>{/**/}{/**/}/y\n'
    );
    expect(stripHtmlComments('See http://x/a<!-- a\nb -->.\n')).toBe(
      'See http://x/a<></>{/*\n*/}.\n'
    );
    // Not after a space, or once the run since the URL holds one.
    expect(stripHtmlComments('See https://x.y/a <!-- a -->.\n')).toBe(
      'See https://x.y/a {/**/}.\n'
    );
    expect(stripHtmlComments('https://x.y/a b<!-- a -->c\n')).toBe('https://x.y/a b{/**/}c\n');
  });

  it('drops a multi-line comment, including one that spans a blank line', () => {
    // The comment's four newlines stay, so later line numbers don't move.
    expect(stripHtmlComments('a\n\n<!--\nline one\n\nline two\n-->\n\nb\n')).toBe(
      'a\n\n{/**/}' + '\n'.repeat(4) + '\n\nb\n'
    );
  });

  it('leaves no blank line for a multi-line comment inside a paragraph', () => {
    // A blank line would split the paragraph; each newline is wrapped in an
    // empty MDX comment expression instead, keeping the line count.
    const src = 'Some text <!--\nTODO: fix wording\n--> and the sentence continues.\n';
    const out = stripHtmlComments(src);
    expect(out).toBe('Some text {/*\n*/}{/*\n*/} and the sentence continues.\n');
    expect(out.split('\n')).toHaveLength(src.split('\n').length);
    // Two lines, closing at the end of its line: the next line is not left blank.
    expect(stripHtmlComments('a <!-- x\n-->\nb\n')).toBe('a {/*\n*/}\nb\n');
  });

  it('keeps list indentation and quote markers inside the comment expressions', () => {
    expect(stripHtmlComments('- item one <!--\n  hidden\n  --> still one\n- item two\n')).toBe(
      '- item one {/*\n  */}{/*\n  */} still one\n- item two\n'
    );
    expect(stripHtmlComments('> a <!--\n> x\n> --> b\n')).toBe('> a {/*\n> */}{/*\n> */} b\n');
  });

  it('leaves a line-starting multi-line comment as a placeholder and blank lines', () => {
    // After list markers or a dropped comment too. The blank lines keep their
    // quote markers and indentation, so the container goes on past them.
    expect(stripHtmlComments('a\n- <!-- x\n  y --> b\n')).toBe('a\n- {/**/}\n   b\n');
    expect(stripHtmlComments('<!-- a --> <!-- b\nc -->\nd\n')).toBe('{/**/} {/**/}\n\nd\n');
    expect(stripHtmlComments('> <!-- x\n> y -->\n> b\n')).toBe('> {/**/}\n> \n> b\n');
    // A deeper quote marker inside the comment is not kept: a blank `> >`
    // line would open an empty inner quote.
    expect(stripHtmlComments('> <!-- x\n> > y\n> -->\n')).toBe('> {/**/}\n> \n> \n');
  });

  it('never leaves a bare list marker where a commented-out item was', () => {
    // A bare `- ` or `1. ` can't interrupt the paragraph above it, so the
    // list would fold into it (or turn it into a setext heading).
    expect(stripHtmlComments('Features:\n- <!-- TODO -->\n- Fast\n')).toBe(
      'Features:\n- {/**/}\n- Fast\n'
    );
    expect(stripHtmlComments('Features:\n* <!-- TODO -->\n* Fast\n')).toBe(
      'Features:\n* {/**/}\n* Fast\n'
    );
    expect(stripHtmlComments('Steps:\n1. <!-- TODO -->\n2. Run\n')).toBe(
      'Steps:\n1. {/**/}\n2. Run\n'
    );
  });

  it('keeps two lists apart around the <!-- --> separator idiom', () => {
    expect(stripHtmlComments('- a\n\n<!-- -->\n\n- b\n')).toBe('- a\n\n{/**/}\n\n- b\n');
  });

  it('lets the brace pass empty the comment expressions it leaves', () => {
    const out = escapeStrayBraces(stripHtmlComments('a {x} <!--\n  y\n--> b\n'));
    expect(out).toBe('a \\{x\\} {\n  }{\n} b\n');
    expect(escapeStrayBraces(stripHtmlComments('a {x} <!-- y --> b {z}\n'))).toBe(
      'a \\{x\\} {} b \\{z\\}\n'
    );
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
    expect(stripHtmlComments(src)).toBe(
      '<p align="center">\n  {/**/}\n  <img src="logo.png" />\n</p>\n'
    );
  });

  it('drops a comment that is the first body line after the frontmatter, keeping the frontmatter', () => {
    const fm = '---\ntitle: Home\nnote: "<!-- not a comment, YAML -->"\n---\n';
    expect(stripHtmlComments(`${fm}<!-- badges -->\n[![npm](x.svg)](y)\n`)).toBe(
      `${fm}{/**/}\n[![npm](x.svg)](y)\n`
    );
  });

  it('drops the CommonMark empty forms <!----> , <!--> and <!--->', () => {
    expect(stripHtmlComments('a<!---->b <!-->c <!--->d\n')).toBe('a{/**/}b {/**/}c {/**/}d\n');
  });

  it('ends a comment at the first -->', () => {
    expect(stripHtmlComments('<!-- a --> shown <!-- b -->\n')).toBe('{/**/} shown {/**/}\n');
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
    expect(stripHtmlComments('<!-- a --> b <!-- c\n')).toBe('{/**/} b \\<!-- c\n');
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
    const out = escapeEsmLookalikes(stripHtmlComments('<!-- note\n-->import it first.\n'));
    expect(out).toBe('{/**/}\n&#x69;mport it first.\n');
    // On one line the placeholder stays in front: no longer a column-0 keyword.
    expect(escapeEsmLookalikes(stripHtmlComments('<!-- note -->import it.\n'))).toBe(
      '{/**/}import it.\n'
    );
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
      '````md\n```js\n````\n\nText {/**/} after.\n\n```js\n<!-- x -->\n```\n'
    );
  });

  it('keeps a comment that is part of a link destination or title', () => {
    const src = '[a](http://x/<!--y-->z) and ![a](x.png "t <!-- c --> d")\n';
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('drops a comment after escaped brackets (no link, so nothing protects it)', () => {
    expect(stripHtmlComments('\\[a\\](http://x/<!--y-->z) more\n')).toBe(
      // The bare URL is an autolink, which the fragment ends where `<` did.
      '\\[a\\](http://x/<></>{/**/}z) more\n'
    );
  });

  it('does not open a fence on a lone fence line inside a comment block', () => {
    expect(stripHtmlComments('<!--\n```js\n-->\n\nText <!-- c --> after.\n')).toBe(
      '{/**/}\n\n' + '\n\nText {/**/} after.\n'
    );
  });

  it('ends a fence opened in a blockquote with the quote', () => {
    expect(stripHtmlComments('> ```\n> code\n\nText <!-- c --> after.\n\n```js\nx\n```\n')).toBe(
      '> ```\n> code\n\nText {/**/} after.\n\n```js\nx\n```\n'
    );
  });

  it('does not let an inline comment run across a heading', () => {
    expect(stripHtmlComments('text <!-- a\n# Heading\n-->\n')).toBe(
      'text \\<!-- a\n# Heading\n-->\n'
    );
  });

  it('does not let an inline comment run across the rows of a table', () => {
    // GFM rows are separate blocks: the opener is literal, as GitHub shows it.
    expect(stripHtmlComments('| h |\n|---|\n| a <!--\nb\n--> c |\n')).toBe(
      '| h |\n|---|\n| a \\<!--\nb\n--> c |\n'
    );
  });

  it('does not let an unterminated inline opener swallow a following fence', () => {
    const src = 'a <!-- b\n\n```html\n<!-- x -->\n```\n\nafter\n';
    expect(stripHtmlComments(src)).toBe('a \\<!-- b\n\n```html\n<!-- x -->\n```\n\nafter\n');
  });

  it('drops a line-starting comment that wraps a whole section, code block included', () => {
    const src = 'Keep.\n\n<!--\n## Old\n\n```js\nold();\n```\n-->\n\nAlso keep.\n';
    expect(stripHtmlComments(src)).toBe('Keep.\n\n{/**/}' + '\n'.repeat(6) + '\n\nAlso keep.\n');
  });

  it('keeps every line number: a multi-line comment becomes blank lines', () => {
    const src = 'l1\n<!--\nc3\nc4\n-->\nl6 <Bad\n';
    const out = stripHtmlComments(src);
    expect(out.split('\n').length).toBe(src.split('\n').length);
    expect(out.split('\n')[5]).toBe('l6 <Bad');
  });

  it('leaves a single-quoted attribute value alone (MDX accepts both quote styles)', () => {
    const src = "<img src='x.png' alt='<!-- not a comment -->' /> <a title='<!-- oops'>x</a>\n";
    expect(stripHtmlComments(src)).toBe(src);
  });

  it('drops a comment after an escaped backslash (even run = not escaped)', () => {
    expect(stripHtmlComments('a \\\\<!-- c --> b\n')).toBe('a \\\\{/**/} b\n');
  });

  it('drops a comment on a quote/heading/list line after an unclosed backtick', () => {
    expect(stripHtmlComments('a `x\n> b <!-- c --> d` e\n')).toBe('a `x\n> b {/**/} d` e\n');
  });

  it('keeps a comment that is code after an over-indented or deeper-quoted fence line', () => {
    for (const src of [
      '```js\n      ```\n<!-- c -->\n```\n',
      '> ```\n> > ```\n> <!-- c -->\n> ```\n',
    ]) {
      expect(stripHtmlComments(src)).toBe(src);
    }
  });

  it('accepts precomputed ranges', () => {
    const src = '---\ntitle: x\n---\na <!-- b --> c\n';
    expect(stripHtmlComments(src, pageCommentRanges(src))).toBe('---\ntitle: x\n---\na {/**/} c\n');
  });
});

// #372: the brace, ESM and backtick passes found code with an unanchored,
// length-blind regex, so a ```` fence around ``` lines (or an odd number of
// fence lines) desynced them: a false backtick warning, a visible `\{` in code,
// or prose read as code and left for MDX to reject. They now read fences the
// way MDX does, through the shared `mdxCodeRanges` scanner.
describe('the pre-passes read fenced code the way MDX does (#372)', () => {
  const README =
    "# T\n\n````md\n```js\nconst a = {x: 1};\n```\nimport x from 'y'\n```\n````\n\nAfter {y: 2} and `code`.\n";
  const LOST = '````md\n```js\ncode\n````\n\nprose {b: 1} here\n\n```js\nx\n```\n';
  const LOST_ESM = '````md\n```js\ncode\n````\n\nimport this module first.\n\n```js\nx\n```\n';

  describe('escapeStrayBraces', () => {
    it('leaves a ```` fence around ``` lines alone and escapes the prose after it', () => {
      expect(escapeStrayBraces(README)).toBe(README.replace('{y: 2}', '\\{y: 2\\}'));
    });

    it('escapes prose after a ```` fence holding one ``` line (the page was lost)', () => {
      expect(escapeStrayBraces(LOST)).toBe(LOST.replace('{b: 1}', '\\{b: 1\\}'));
    });

    it.each<[string, string, string]>([
      [
        'a ~~~ fence around a ``` line',
        '~~~md\n```\n{c}\n~~~\n\n{d}\n',
        '~~~md\n```\n{c}\n~~~\n\n\\{d\\}\n',
      ],
      [
        'a list-item fence',
        '- item\n\n  ```js\n  const o = {l: 1};\n  ```\n\ntail {n}\n',
        '- item\n\n  ```js\n  const o = {l: 1};\n  ```\n\ntail \\{n\\}\n',
      ],
      [
        'a list-item fence ended by an outdented line',
        '- a\n\n  ```js\n  {l: 1}\nout {m}\n',
        '- a\n\n  ```js\n  {l: 1}\nout \\{m\\}\n',
      ],
      [
        "a quoted fence ended by the quote's end",
        '> ```js\n> {l: 1}\n\nout {m}\n',
        '> ```js\n> {l: 1}\n\nout \\{m\\}\n',
      ],
      [
        'an unclosed fence',
        'text {j}\n\n```js\nconst o = {k: 1};\n',
        'text \\{j\\}\n\n```js\nconst o = {k: 1};\n',
      ],
      [
        'an indented closer',
        '```\n{x}\n        ```\n\n{z}\n',
        '```\n{x}\n        ```\n\n\\{z\\}\n',
      ],
      [
        'an indented opener after a paragraph',
        'para\n    ```\n{x}\n    ```\n\n{z}\n',
        'para\n    ```\n{x}\n    ```\n\n\\{z\\}\n',
      ],
      ['an indented line (MDX has no indented code)', 'para\n\n    {x}\n', 'para\n\n    \\{x\\}\n'],
      ["an author's escaped braces", 'a \\{x\\} b\n', 'a \\{x\\} b\n'],
      [
        'a comment placeholder inside a ```` fence',
        '````md\n```\n{/**/}\n````\n\n{/**/}\n',
        '````md\n```\n{/**/}\n````\n\n{}\n',
      ],
      // Review follow-ups: MDX has no HTML blocks, so a span crosses a line
      // that starts with a tag (the page was lost on `{x}`).
      [
        'a span across a line starting with a tag',
        'Wrap items in `<ul>\n<li>` tags, pass {x} or `y`.\n',
        'Wrap items in `<ul>\n<li>` tags, pass \\{x\\} or `y`.\n',
      ],
      [
        'a span across a line starting with a block-level tag',
        'The `{children}\n<div>` wrapper.\n',
        'The `{children}\n<div>` wrapper.\n',
      ],
      [
        'a list marker, then a quoted fence',
        '- > ```js\n  > const a = {b};\n  > ```\n\nafter {c}\n',
        '- > ```js\n  > const a = {b};\n  > ```\n\nafter \\{c\\}\n',
      ],
      [
        'two list markers, then a fence',
        '- - ```js\n    a = {b};\n\n    c = {d};\n    ```\n',
        '- - ```js\n    a = {b};\n\n    c = {d};\n    ```\n',
      ],
      [
        'a quoted fence four columns into a list item',
        '1.  Step\n\n    > ~~~js\n    > const a = {b};\n    > ~~~\n',
        '1.  Step\n\n    > ~~~js\n    > const a = {b};\n    > ~~~\n',
      ],
      [
        'a fence in a tab-marker item, ended by the item',
        '-\tStep\n\n\t```js\n\tconst a = {b};\n\nNext {para}\n',
        '-\tStep\n\n\t```js\n\tconst a = {b};\n\nNext \\{para\\}\n',
      ],
      [
        "a fence after the comment pass's placeholder line",
        '- item\n{/**/}\n  ```js\nconst a = {b};\n  ```\n',
        '- item\n{}\n  ```js\nconst a = {b};\n  ```\n',
      ],
    ])('handles %s', (_name, src, want) => {
      expect(escapeStrayBraces(src)).toBe(want);
    });
  });

  describe('escapeEsmLookalikes', () => {
    it('leaves an import inside a nested fence alone and escapes the prose import after it', () => {
      expect(escapeEsmLookalikes(README)).toBe(README);
      expect(escapeEsmLookalikes(LOST_ESM)).toBe(
        LOST_ESM.replace('import this', '&#x69;mport this')
      );
    });

    it.each<[string, string, string]>([
      [
        'a ~~~ fence around a ``` line',
        '~~~md\n```\nimport a from "b"\n~~~\n\nimport this later.\n',
        '~~~md\n```\nimport a from "b"\n~~~\n\n&#x69;mport this later.\n',
      ],
      [
        'a list-item fence ended by an outdented line',
        '- a\n\n  ```js\n  x\nimport out\n',
        '- a\n\n  ```js\n  x\n&#x69;mport out\n',
      ],
      [
        "a quoted fence ended by the quote's end",
        '> ```js\n> x\n\nimport out\n',
        '> ```js\n> x\n\n&#x69;mport out\n',
      ],
      [
        'an unclosed fence',
        "text\n\n```js\nimport z from 'z'\n",
        "text\n\n```js\nimport z from 'z'\n",
      ],
      [
        'an indented closer',
        '```\nimport y\n        ```\n\nimport z\n',
        '```\nimport y\n        ```\n\n&#x69;mport z\n',
      ],
      [
        'an indented opener after a paragraph',
        'para\n    ```\nimport y\n    ```\n\nexport z\n',
        'para\n    ```\nimport y\n    ```\n\n&#x65;xport z\n',
      ],
    ])('handles %s', (_name, src, want) => {
      expect(escapeEsmLookalikes(src)).toBe(want);
    });
  });

  describe('findStrayBackticks', () => {
    it('reports nothing for a ```` fence around ``` lines', () => {
      expect(findStrayBackticks(README)).toEqual([]);
      expect(findStrayBackticks(LOST)).toEqual([]);
    });

    it.each<[string, string]>([
      ['a ~~~ fence around a ``` line', '~~~md\n```\n~~~\n\n`a`\n'],
      ['a list-item fence', '- a\n\n  ```js\n  x\n  ```\n\n`b`\n'],
      ['a quoted fence', '> ```js\n> x\n\n`c`\n'],
      ['an unclosed fence', '```js\nx `\n'],
      ['an indented closer', '```\nx\n        ```\n\n`d`\n'],
      ['a span across a line starting with a tag', 'Use `<ul>\n<li>` here.\n'],
      ['a list marker, then a quoted fence', '- > ```js\n  > x\n  > ```\n'],
      ['two list markers, then a fence', '- - ```js\n    x\n    ```\n'],
    ])('reports nothing for %s', (_name, src) => {
      expect(findStrayBackticks(src)).toEqual([]);
    });

    it('reports the line and column of a stray backtick after the frontmatter', () => {
      expect(findStrayBackticks('---\na: `1\n---\n\nx `y\n\nz\n')).toEqual([
        { line: 5, column: 3, lineText: 'x `y' },
      ]);
    });

    it('reports a stray backtick on a line past many others', () => {
      const src = 'a\n'.repeat(1000) + 'b `c\n\n`d` `\n';
      expect(findStrayBackticks(src)).toEqual([
        { line: 1001, column: 3, lineText: 'b `c' },
        { line: 1003, column: 5, lineText: '`d` `' },
      ]);
    });
  });

  // The three regex implementations these passes replaced, kept as oracles:
  // on prose without backticks, tildes or backslashes (no fence, no span, no
  // escape) the rewrite must give the same output.
  describe('prose reads as before', () => {
    const REF_FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
    const referenceBraces = (source: string): string => {
      const fm = REF_FRONTMATTER.exec(source);
      const prefix = fm ? fm[0] : '';
      const body = fm ? source.slice(fm[0].length) : source;
      const re =
        /(```[\s\S]*?```|~~~[\s\S]*?~~~)|((?<!\\)<\/?[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][\w-]*(?:="[^"]*"|='[^']*')?)*\s*\/?>)|(?<![`\\])(`+)(?:[^\n]|\n(?![ \t\r]*\n))*?(?<![`\\])\3(?!`)|(\{\/\*(\n[ \t>]*)?\*\/\})|([{}])/g;
      return (
        prefix +
        body.replace(
          re,
          (
            m,
            _fence,
            _jsx,
            _ticks,
            placeholder: string | undefined,
            gap: string | undefined,
            brace: string | undefined
          ) => (placeholder ? `{${gap ?? ''}}` : brace ? `\\${brace}` : m)
        )
      );
    };
    const referenceEsm = (source: string): string => {
      const fm = REF_FRONTMATTER.exec(source);
      const prefix = fm ? fm[0] : '';
      const body = fm ? source.slice(fm[0].length) : source;
      const re =
        /(```[\s\S]*?```|~~~[\s\S]*?~~~)|((?<!\\)<\/?[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][\w-]*(?:="[^"]*"|='[^']*')?)*\s*\/?>)|(?<![`\\])(`+)(?:[^\n]|\n(?![ \t\r]*\n))*?(?<![`\\])\3(?!`)|^(import|export)(?=\s)/gm;
      return (
        prefix +
        body.replace(re, (m, _fence, _jsx, _ticks, keyword: string | undefined) =>
          keyword ? `&#x${keyword.charCodeAt(0).toString(16)};${keyword.slice(1)}` : m
        )
      );
    };
    // Comments are not masked: the inputs hold none.
    const referenceStrays = (
      source: string
    ): { line: number; column: number; lineText: string }[] => {
      const out: { line: number; column: number; lineText: string }[] = [];
      const fm = REF_FRONTMATTER.exec(source);
      const re =
        /(```[\s\S]*?```|~~~[\s\S]*?~~~)|(?<![`\\])((`+)(?:[^\n]|\n(?![ \t\r]*\n))*?(?<![`\\])\3(?!`))|(?<![`\\])(`+)/g;
      re.lastIndex = fm ? fm[0].length : 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source)) !== null) {
        if (m[4] === undefined) continue;
        const idx = m.index;
        const lastNl = source.lastIndexOf('\n', idx - 1);
        const nextNl = source.indexOf('\n', idx);
        out.push({
          line: source.slice(0, idx).split('\n').length,
          column: idx - lastNl,
          lineText: source.slice(lastNl + 1, nextNl === -1 ? source.length : nextNl),
        });
      }
      return out;
    };

    it('the references tell the cases apart', () => {
      expect(referenceBraces('a {b} <X a="{c}" /> {/**/}')).toBe('a \\{b\\} <X a="{c}" /> {}');
      expect(referenceEsm('import a\n<X a="\nimport b" />\n')).toBe(
        '&#x69;mport a\n<X a="\nimport b" />\n'
      );
      expect(referenceStrays('a `b\n\nc')).toEqual([{ line: 1, column: 3, lineText: 'a `b' }]);
    });

    it('gives the same output on seeded random prose', () => {
      const pieces = [
        'word ',
        'a',
        ' ',
        ' ',
        '\n',
        '\n',
        '\n\n',
        '{',
        '}',
        '{x}',
        '{/**/}',
        '{/*\n> */}',
        '{/*\n*/}',
        'import ',
        'export ',
        '\nimport x\n',
        '> ',
        '- ',
        '# ',
        '1. ',
        '<',
        '>',
        '<X a="{q}" />',
        "<img alt='{x}\n\nimport y'>",
        '</b>',
        '<b>',
        '"',
        "'",
        '=',
        '    ',
        '\t',
        '|',
        '---',
        '***',
        '<></>',
        'https://x',
        '\r\n',
      ];
      expectSameAsReferences(pieces, 30_000, ['braces', 'esm']);
    });

    // Code spans in plain paragraphs (no fence, heading, list, quote, table,
    // tag or backslash): spans pair, and a run with no partner before a blank
    // line is stray, exactly as before.
    it('reads code spans in plain paragraphs as before', () => {
      const pieces = [
        'word ',
        'a',
        ' ',
        ' ',
        '\n',
        '\n',
        '\n\n',
        '\n  \n',
        '`',
        '`',
        '``',
        '{x}',
        '}',
        'import ',
        '\nimport x\n',
        '\t',
      ];
      expectSameAsReferences(pieces, 30_000, ['braces', 'esm', 'strays']);
    });

    /** Seeded random bodies from `pieces` give the references' output for each pass named. */
    function expectSameAsReferences(
      pieces: readonly string[],
      count: number,
      passes: readonly ('braces' | 'esm' | 'strays')[]
    ): void {
      const same = {
        braces: (s: string) => escapeStrayBraces(s) === referenceBraces(s),
        esm: (s: string) => escapeEsmLookalikes(s) === referenceEsm(s),
        strays: (s: string) =>
          JSON.stringify(findStrayBackticks(s)) === JSON.stringify(referenceStrays(s)),
      };
      let seed = 372;
      const next = (k: number): number => {
        seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
        return seed % k;
      };
      const mismatches = { braces: 0, esm: 0, strays: 0 };
      let strayRuns = 0;
      let first: string | undefined;
      for (let n = 0; n < count; n++) {
        let s = next(10) === 0 ? '---\na: {b}\nimport: c\n---\n' : '';
        for (let len = 1 + next(25); len > 0; len--) s += pieces[next(pieces.length)];
        if (passes.includes('strays')) strayRuns += referenceStrays(s).length;
        for (const k of passes) {
          if (!same[k](s)) {
            mismatches[k]++;
            first ??= s;
          }
        }
      }
      if (first !== undefined) {
        if (passes.includes('braces')) {
          expect(escapeStrayBraces(first), JSON.stringify(first)).toBe(referenceBraces(first));
        }
        if (passes.includes('esm')) {
          expect(escapeEsmLookalikes(first), JSON.stringify(first)).toBe(referenceEsm(first));
        }
        if (passes.includes('strays')) {
          expect(findStrayBackticks(first), JSON.stringify(first)).toEqual(referenceStrays(first));
        }
      }
      expect(mismatches).toEqual({ braces: 0, esm: 0, strays: 0 });
      // The stray leg is not vacuous: the inputs hold plenty of stray runs.
      if (passes.includes('strays')) expect(strayRuns).toBeGreaterThan(count / 10);
    }
  });

  // A page body passes through each of these once per build; none may go
  // quadratic or overflow the stack (they did on a code span of 8M characters).
  describe('performance', () => {
    const passes = {
      escapeStrayBraces,
      escapeEsmLookalikes,
      findStrayBackticks: (s: string) => findStrayBackticks(s, []),
      preprocessJsdocInlineTags,
    };
    const shapes: [string, (n: number) => string][] = [
      [
        'fences, spans and tags',
        (n) =>
          '````md\n```js\n{a}\n````\n\nSee `a{b}` <X a="{c}" /> {d}.\n\nimport it\n\n'.repeat(
            n / 58
          ),
      ],
      ['one code span over many lines', (n) => '`' + 'word {x}\n'.repeat(n / 9) + '` {y}\n'],
      ['an unclosed backtick then a long paragraph', (n) => '`' + 'word {x}\n'.repeat(n / 9)],
      ['many stray backticks', (n) => '` a `` b ``` c {x}\n\n'.repeat(n / 20)],
      [
        'unclosed backtick runs of distinct lengths',
        (n) => {
          let s = '';
          for (let k = 1; s.length < n / 2; k++) s += '`'.repeat(k) + ' ';
          return s + 'word {x} '.repeat(n / 18);
        },
      ],
      ['one tag with many attributes', (n) => '<a ' + 'b="c" '.repeat(n / 6) + '/> {x}\n'],
      ['one unclosed tag with many attributes', (n) => '<a ' + 'b="c" '.repeat(n / 6) + '{x}\n'],
      ['import lines', (n) => 'import it now\n\n'.repeat(n / 15)],
      ['list-item fences', (n) => '- a\n\n  ```\n  {x}\n  ```\n'.repeat(n / 24)],
      [
        'tilde fences between plain paragraphs',
        (n) => '~~~\ncode {a}\n~~~\n\ntext {b}\n\n'.repeat(n / 27),
      ],
      ['marker-then-quote fences', (n) => '- > ```js\n  > {a}\n  > ```\n\n'.repeat(n / 28)],
      ['a page of prose tags', (n) => 'see {@link Foo} and `x` {@b c`d}.\n\n'.repeat(n / 35)],
      ['tags inside code spans', (n) => 'a `b {@link c} d` e\n'.repeat(n / 20)],
      ['unclosed tag openers', (n) => '{@a '.repeat(n / 4)],
    ];
    const cases = Object.entries(passes).flatMap(([pass, fn]) =>
      shapes.map(([shape, make]) => [pass, shape, fn, make] as const)
    );

    it.each(cases)(
      '%s: %s scales linearly',
      (_pass, _shape, fn, makeInput) => {
        expectLinearScaling(fn, makeInput);
      },
      PERF_TEST_TIMEOUT
    );

    // One global replace over a gap full of braces slows down past several
    // hundred thousand matches (a V8 cliff, see linear-scaling.ts): the window
    // stays below it.
    it(
      'escapeStrayBraces: a page of braces scales linearly',
      () => {
        expectLinearScaling(escapeStrayBraces, (n) => 'a {b} c\n'.repeat(n / 8), {
          maxSize: 32_768,
        });
      },
      PERF_TEST_TIMEOUT
    );

    it('none throws on a code span or a tag of 16M characters', () => {
      const n = 16 * 1024 * 1024;
      const span = '`' + 'x'.repeat(n) + '` {y}\nimport z\n';
      expect(escapeStrayBraces(span).endsWith('` \\{y\\}\nimport z\n')).toBe(true);
      expect(escapeEsmLookalikes(span).endsWith('` {y}\n&#x69;mport z\n')).toBe(true);
      expect(findStrayBackticks(span, [])).toEqual([]);
      const tag = '<a ' + 'b="c" '.repeat(n / 6) + '/> {x}\n';
      expect(escapeStrayBraces(tag).endsWith('/> \\{x\\}\n')).toBe(true);
      expect(escapeEsmLookalikes(tag)).toBe(tag);
      const open = '`' + 'x'.repeat(n) + ' {y}\n';
      expect(findStrayBackticks(open, [])).toHaveLength(1);
      expect(preprocessJsdocInlineTags(span + '{@link y}\n')).toBe(span + '`@link y`\n');
      expect(preprocessJsdocInlineTags(tag + '{@link y}\n')).toBe(tag + '`@link y`\n');
      const long = '{@link ' + 'x'.repeat(n) + '}\n';
      expect(preprocessJsdocInlineTags(long)).toBe('`@link ' + 'x'.repeat(n) + '`\n');
    });
  });
});
