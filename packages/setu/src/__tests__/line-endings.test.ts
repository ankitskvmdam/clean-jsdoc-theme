/**
 * CRLF sources (#369). JSDoc's `unwrap()` turns each `\r\n * ` of a comment into
 * a lone `\r`, and TypeDoc keeps the `\r\n`; either way doclet text reached setu
 * with `\r` line breaks, so an `@example` collapsed onto one line. generateSite
 * now normalises every doclet string to `\n` first.
 */
import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { generateSite } from '../index';
import { normalizeDocletLineEndings, normalizeLineEndings } from '../line-endings';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

const meta = () => ({ filename: 'a.js', path: '/p', lineno: 1, columnno: 0, code: {} });

/** A global function doclet, with `overrides` merged on top. */
function fn(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'function',
    name: 'doThing',
    longname: 'doThing',
    scope: 'global',
    description: 'Does a thing.',
    meta: meta(),
    ...overrides,
  };
}

function globalBody(items: unknown[], opts?: Parameters<typeof generateSite>[1]): string {
  const page = generateSite(makeCollection(items), opts).pages.find((p) => p.slug === 'global');
  expect(page).toBeDefined();
  return page!.body;
}

describe('normalizeLineEndings', () => {
  it('turns CRLF and lone CR into LF', () => {
    expect(normalizeLineEndings('a\r\nb\rc\n')).toBe('a\nb\nc\n');
    expect(normalizeLineEndings('\r\r')).toBe('\n\n');
  });

  it('returns a string without CR unchanged', () => {
    const s = 'a\nb';
    expect(normalizeLineEndings(s)).toBe(s);
  });
});

describe('normalizeDocletLineEndings', () => {
  it('does not mutate its input, copies the changed doclet, and keeps meta', () => {
    const d = fn({ description: 'one\rtwo' });
    const before = JSON.stringify(d);
    const input = makeCollection([d]);
    const original = input().get()[0];
    const out = normalizeDocletLineEndings(input);
    const doclet = out().get()[0];

    expect(JSON.stringify(input().get()[0])).toBe(before);
    expect(doclet).not.toBe(original);
    expect(doclet.description).toBe('one\ntwo');
    expect(doclet.meta).toBe(original.meta);
  });

  it('returns the same collection when nothing holds a CR', () => {
    const input = makeCollection([fn({ description: 'one\ntwo', examples: ['a\nb'] })]);
    expect(normalizeDocletLineEndings(input)).toBe(input);
  });

  it('normalises nested params, returns, examples, see and class-instance tags', () => {
    const Tag = class {
      title = 'iframe';
      text = 'a\rb';
    };
    const input = makeCollection([
      fn({
        params: [{ name: 'x', description: 'p\r\nq' }],
        returns: [{ description: 'r\rs' }],
        examples: ['const a = 1;\rconst b = 2;'],
        see: ['first\r    trailing'],
        tags: [new Tag()],
      }),
    ]);
    const d = normalizeDocletLineEndings(input)().get()[0] as unknown as {
      params: { description: string }[];
      returns: { description: string }[];
      examples: string[];
      see: string[];
      tags: { title: string; text: string }[];
    };
    expect(d.params[0].description).toBe('p\nq');
    expect(d.returns[0].description).toBe('r\ns');
    expect(d.examples[0]).toBe('const a = 1;\nconst b = 2;');
    expect(d.see[0]).toBe('first\n    trailing');
    expect(d.tags[0].text).toBe('a\nb');
    expect(d.tags[0].title).toBe('iframe');
  });

  it('leaves meta alone', () => {
    const m = { ...meta(), code: { value: 'x\r\ny' } };
    const d = normalizeDocletLineEndings(
      makeCollection([fn({ description: 'a\rb', meta: m })])
    )().get()[0];
    expect(d.meta).toBe(m);
    expect((d.meta as { code: { value: string } }).code.value).toBe('x\r\ny');
  });

  it('handles a self-referencing value', () => {
    const loop: Record<string, unknown> = { text: 'a\rb' };
    loop.self = loop;
    const d = normalizeDocletLineEndings(
      makeCollection([fn({ extra: loop })])
    )().get()[0] as unknown as {
      extra: { text: string; self: unknown };
    };
    expect(d.extra.text).toBe('a\nb');
    // The cycle closes on the original object; it is not walked twice.
    expect(d.extra.self).toBe(loop);
    expect(loop.text).toBe('a\rb');
  });
});

describe('generateSite with CRLF doclet text (#369)', () => {
  it('keeps the lines of an example joined by a lone CR', () => {
    const body = globalBody([fn({ examples: ['const a = 1;\rconst b = 2;'] })]);
    expect(body).toContain('```js\nconst a = 1;\nconst b = 2;\n```');
    expect(body).not.toContain('\r');
  });

  it.each(['\n', '\r', '\r\n'])('builds the same page for line ending %j', (eol) => {
    const doclet = (nl: string) =>
      fn({
        description: ['First line', 'second line.'].join(nl),
        examples: [
          ['<caption>Shell</caption>{@lang bash}', 'npm i x', 'npm run y'].join(nl),
          ['```ts', 'const a = 1;', 'const b = 2;', '```'].join(nl),
        ],
        see: [['https://example.com', '    trailing'].join(nl)],
        deprecated: ['Use', 'other.'].join(nl),
      });
    const body = globalBody([doclet(eol)]);
    expect(body).toBe(globalBody([doclet('\n')]));
    expect(body).not.toContain('\r');
  });

  it('does not fence an author-fenced example twice', () => {
    const body = globalBody([fn({ examples: ['```ts\rconst a = 1;\rconst b = 2;\r```'] })]);
    expect(body).toContain('```ts\n');
    expect(body).not.toContain('````');
  });

  it('keeps CRLF out of TypeDoc-flavored pages', () => {
    const { pages } = generateSite(
      makeCollection([fn({ examples: ['```typescript\r\nconst a = 1;\r\nconst b = 2;\r\n```'] })]),
      { flavor: 'typedoc' }
    );
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) expect(p.body).not.toContain('\r');
    expect(pages.some((p) => p.body.includes('const a = 1;\nconst b = 2;'))).toBe(true);
  });

  it('gives translation slots the same source text and hash as an LF build', () => {
    const slots = (desc: string) => generateSite(makeCollection([fn({ description: desc })])).slots;
    expect(slots('First.\r\rSecond.')).toEqual(slots('First.\n\nSecond.'));
  });

  it('builds CRLF docs and README pages like LF ones (unchanged inputs)', () => {
    const site = (nl: string) =>
      generateSite(makeCollection([fn()]), {
        readme: ['<h1>Readme</h1>', '<p>Hello</p>'].join(nl),
        docs: [
          {
            path: 'guide',
            type: 'markdown',
            content: [
              '---',
              'title: Guide',
              '---',
              '',
              '# Guide',
              '',
              '```js',
              'a();',
              'b();',
              '```',
              '',
            ].join(nl),
          },
        ],
      }).pages.filter((p) => p.slug === 'index' || p.slug === 'guide');
    const crlf = site('\r\n');
    const lf = site('\n');
    expect(crlf.length).toBeGreaterThan(0);
    expect(crlf.map((p) => p.body)).toEqual(lf.map((p) => p.body));
  });
});
