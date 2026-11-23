import { describe, it, expect } from 'vitest';
import { prefixRootRelativeUrls } from '../md-base-path';
import { expectLinearScaling, PERF_TEST_TIMEOUT } from './linear-scaling';

const FENCE = '```';

describe('prefixRootRelativeUrls', () => {
  const body = '# T\n\n[a](/guide/x#h) and ![d](/_assets/d.png)\n';

  it('is the identity at the root base (same string back)', () => {
    expect(prefixRootRelativeUrls(body, '/')).toBe(body);
    expect(prefixRootRelativeUrls(body, '')).toBe(body);
    expect(prefixRootRelativeUrls(body, undefined)).toBe(body);
  });

  it('returns an empty body unchanged', () => {
    expect(prefixRootRelativeUrls('', '/docs')).toBe('');
  });

  it('prefixes with or without a trailing slash on the base', () => {
    const want = '# T\n\n[a](/docs/guide/x#h) and ![d](/docs/_assets/d.png)\n';
    expect(prefixRootRelativeUrls(body, '/docs')).toBe(want);
    expect(prefixRootRelativeUrls(body, '/docs/')).toBe(want);
  });

  it('prefixes with a nested base', () => {
    expect(prefixRootRelativeUrls('[a](/g/x#h) ![d](/_assets/d.png)', '/a/b')).toBe(
      '[a](/a/b/g/x#h) ![d](/a/b/_assets/d.png)'
    );
    expect(prefixRootRelativeUrls('<img src="/x.png">', '/a/b/')).toBe('<img src="/a/b/x.png">');
    expect(prefixRootRelativeUrls('[logo]: /l.svg', '/a/b')).toBe('[logo]: /a/b/l.svg');
  });

  it('inserts a base containing `$` literally (no replacement-pattern expansion)', () => {
    expect(prefixRootRelativeUrls('[a](/g/x#h) ![d](/_assets/d.png)', '/a$b')).toBe(
      '[a](/a$b/g/x#h) ![d](/a$b/_assets/d.png)'
    );
    expect(prefixRootRelativeUrls('<a href="/x">x</a>', "/$&$1$'")).toBe(
      `<a href="/$&$1$'/x">x</a>`
    );
    expect(prefixRootRelativeUrls('[logo]: /l.svg', '/$$')).toBe('[logo]: /$$/l.svg');
  });

  it('prefixes links, titled images and angle-bracket destinations', () => {
    expect(prefixRootRelativeUrls('[a](/guide/x#h)', '/docs')).toBe('[a](/docs/guide/x#h)');
    expect(prefixRootRelativeUrls('![d](/_assets/d.png "t")', '/docs')).toBe(
      '![d](/docs/_assets/d.png "t")'
    );
    expect(prefixRootRelativeUrls('[a](</sp ace/x>)', '/docs')).toBe('[a](</docs/sp ace/x>)');
  });

  it('leaves protocol-relative, absolute, relative, hash and mailto URLs untouched', () => {
    const untouched = [
      '[c](//cdn.x/y)',
      '[e](https://x/y)',
      '[r](./rel)',
      '[h](#h)',
      '<img src="data:image/png;base64,AA">',
      '<a href="//h/x">p</a>',
      '<a href="mailto:a@b">m</a>',
    ].join('\n');
    expect(prefixRootRelativeUrls(untouched, '/docs')).toBe(untouched);
  });

  it('prefixes href, src and sourceHref attributes in either quote style', () => {
    expect(prefixRootRelativeUrls('<a href="/x">x</a>', '/docs')).toBe('<a href="/docs/x">x</a>');
    expect(prefixRootRelativeUrls("<img src='/x.png'>", '/docs')).toBe("<img src='/docs/x.png'>");
    expect(
      prefixRootRelativeUrls('<SourceLink href="/source/a.ts" label="a.ts:1" />', '/docs')
    ).toBe('<SourceLink href="/docs/source/a.ts" label="a.ts:1" />');
    expect(
      prefixRootRelativeUrls(
        '<MemberMeta sourceHref="/source/a.ts#L1" sourceLabel="a.ts:1" />',
        '/docs'
      )
    ).toBe('<MemberMeta sourceHref="/docs/source/a.ts#L1" sourceLabel="a.ts:1" />');
  });

  it('prefixes reference definitions but not protocol-relative ones', () => {
    expect(prefixRootRelativeUrls('[logo]: /_assets/l.svg', '/docs')).toBe(
      '[logo]: /docs/_assets/l.svg'
    );
    expect(prefixRootRelativeUrls('  [x]: //h', '/docs')).toBe('  [x]: //h');
  });

  it('leaves URLs inside code regions untouched', () => {
    const regions = [
      `${FENCE}md\n[no](/x) href="/x"\n${FENCE}`,
      '~~~\n[no](/x)\n~~~',
      '<pre>[no](/x) href="/x"</pre>',
      '<code>[no](/x)</code>',
      '`[no](/x)`',
    ];
    for (const region of regions) {
      const text = `[yes](/y)\n\n${region}\n`;
      expect(prefixRootRelativeUrls(text, '/docs')).toBe(`[yes](/docs/y)\n\n${region}\n`);
    }
  });

  // setu writes a tag that isn't markup (`<Link href="/x">` in prose) as the
  // literal text `\<Link href="/x">`, and the HTML page shows its URL as typed.
  describe('escaped tags', () => {
    it('leaves the attributes of an escaped tag untouched', () => {
      const literal = [
        'Use \\<Link href="/x"> here.',
        'Or \\<Image src=\'/a.png\' alt="a > b" sourceHref="/s.ts">.',
        'Closed \\<Link href="/x">Go\\</Link> too.',
        'Unclosed \\<Link href="/x"',
      ].join('\n');
      expect(prefixRootRelativeUrls(literal, '/docs')).toBe(literal);
    });

    it('prefixes a real tag after an even run of backslashes (an escaped backslash)', () => {
      expect(prefixRootRelativeUrls('a \\\\<a href="/x">x</a>', '/docs')).toBe(
        'a \\\\<a href="/docs/x">x</a>'
      );
      expect(prefixRootRelativeUrls('\\\\\\\\<img src="/i.png">', '/docs')).toBe(
        '\\\\\\\\<img src="/docs/i.png">'
      );
    });

    it('leaves a tag after an odd run of three backslashes untouched', () => {
      const literal = 'a \\\\\\<a href="/x">x';
      expect(prefixRootRelativeUrls(literal, '/docs')).toBe(literal);
    });

    it('prefixes real tags and links next to an escaped one', () => {
      expect(
        prefixRootRelativeUrls(
          '\\<Link href="/x"> then <a href="/y">y</a> and [z](/z) \\<T> <img src="/i.png">',
          '/docs'
        )
      ).toBe(
        '\\<Link href="/x"> then <a href="/docs/y">y</a> and [z](/docs/z) \\<T> <img src="/docs/i.png">'
      );
    });

    it('ends an escaped tag at an unquoted `<`, so a real tag after it is prefixed', () => {
      expect(prefixRootRelativeUrls('\\<Foo <a href="/y">y</a>', '/docs')).toBe(
        '\\<Foo <a href="/docs/y">y</a>'
      );
      // A backslash run before a `<` starts the next tag, escaped or not.
      const literal = '\\<A href="/x" \\<B href="/y"';
      expect(prefixRootRelativeUrls(literal, '/docs')).toBe(literal);
      expect(prefixRootRelativeUrls('\\<A \\\\<a href="/y">', '/docs')).toBe(
        '\\<A \\\\<a href="/docs/y">'
      );
    });

    it('does not take an escaped `<` before a non-letter for a tag', () => {
      expect(prefixRootRelativeUrls('a \\< b <a href="/y">y</a>', '/docs')).toBe(
        'a \\< b <a href="/docs/y">y</a>'
      );
    });

    it.each([
      ['escaped tags', '\\<Link href="/x"> '],
      ['unclosed escaped tags', '\\<Link href="/x" '],
      ['backslash runs before tags', '\\\\\\\\<a href="/x"> '],
      ['unclosed quotes in escaped tags', '\\<a b="x '],
    ])(
      'scales linearly on %s',
      (_name, unit) => {
        // The size is in characters, roughly (see linear-scaling.ts).
        expectLinearScaling(
          (s: string) => prefixRootRelativeUrls(s, '/docs'),
          (n) => unit.repeat(n / unit.length)
        );
      },
      PERF_TEST_TIMEOUT
    );
  });

  it('passes a frontmatter block through unchanged', () => {
    const fm = '---\ntitle: Guide\nkind: guide\n---\n\n';
    expect(prefixRootRelativeUrls(`${fm}[a](/x)\n`, '/docs')).toBe(`${fm}[a](/docs/x)\n`);
  });

  it('leaves URL-like text in frontmatter values alone (#370 plain-text description)', () => {
    const fm = '---\ntitle: G\ndescription: Render <Link href="/x"> or [a](/y).\n---\n\n';
    expect(prefixRootRelativeUrls(`${fm}[a](/x)\n`, '/docs')).toBe(`${fm}[a](/docs/x)\n`);
    // An unterminated block is not frontmatter: the body is still rewritten.
    expect(prefixRootRelativeUrls('---\n<a href="/x">', '/docs')).toBe('---\n<a href="/docs/x">');
  });
});
