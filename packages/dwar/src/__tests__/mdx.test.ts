import { describe, it, expect } from 'vitest';
import {
  collectUsedLangs,
  escapeStrayBraces,
  findStrayBackticks,
  preprocessJsdocInlineTags,
  signatureParamRanges,
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
