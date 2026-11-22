import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { default as salty } from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { withFrontmatter } from '../mdx';
import { generateSite } from '../index';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

/** The emitted `description:` line for a single-key frontmatter. */
const line = (v: unknown) => withFrontmatter('', { description: v }).split('\n')[1];
/** The YAML between the `---` fences, with its trailing newline. */
const yamlOf = (out: string) => out.slice(4, out.indexOf('\n---\n', 4) + 1);

describe('frontmatter YAML quoting (#384)', () => {
  it.each<[unknown, string]>([
    ['See #123 for details', 'description: "See #123 for details"'],
    ['C# and F#', 'description: C# and F#'],
    ['Foo#bar', 'description: Foo#bar'],
    ['module:foo~Bar#method', 'description: module:foo~Bar#method'],
    ['key: value', 'description: "key: value"'],
    ['ends with colon:', 'description: "ends with colon:"'],
    ['http://x.y/z', 'description: http://x.y/z'],
    ['', 'description: ""'],
    ['trail ', 'description: "trail "'],
    [' lead', 'description: " lead"'],
    ['tab\there', 'description: "tab\\there"'],
    ['line1\nline2', 'description: "line1\\nline2"'],
    ['say "hi"', 'description: say "hi"'],
    ['"quoted"', 'description: "\\"quoted\\""'],
    ['C:\\Users\\x', 'description: C:\\Users\\x'],
    ['- item', 'description: "- item"'],
    ['true', 'description: "true"'],
    ['Yes', 'description: "Yes"'],
    ['null', 'description: "null"'],
    ['~', 'description: "~"'],
    ['404', 'description: "404"'],
    ['0x1F', 'description: "0x1F"'],
    ['1:30', 'description: "1:30"'],
    ['2001-12-14', 'description: "2001-12-14"'],
    ['.inf', 'description: ".inf"'],
    ['2nd edition', 'description: 2nd edition'],
    ['a, b', 'description: a, b'],
    ['del\u007f', 'description: "del\\u007f"'],
    ['ls\u2028', 'description: "ls\\u2028"'],
    [['a, b', 'c'], 'description: ["a, b", c]'],
    [3, 'description: 3'],
    [true, 'description: true'],
    [Infinity, 'description: .inf'],
  ])('emits %j as %s', (input, expected) => {
    expect(line(input)).toBe(expected);
  });

  it('quotes keys a YAML parser would misread', () => {
    expect(withFrontmatter('', { 'a: b': 'x' }).split('\n')).toContain('"a: b": x');
  });

  const NASTY: string[] = [
    'See #123 for details',
    'C# and F#',
    'Foo#bar',
    'module:foo~Bar#method',
    'key: value',
    'ends with colon:',
    'http://x.y/z',
    '',
    'trail ',
    ' lead',
    'tab\there',
    'line1\nline2',
    'say "hi"',
    '"quoted"',
    'C:\\Users\\x',
    '- item',
    'true',
    'Yes',
    'null',
    '~',
    '404',
    '0x1F',
    '1:30',
    '2001-12-14',
    '.inf',
    '2nd edition',
    'a, b',
    'del\u007f',
    'ls\u2028',
    'a #b',
    'a\t#b',
    '#lead',
    'a  #  b',
    'über #1',
    'a:',
    'a: b: c',
    'a :b',
    '-',
    '-x',
    '? q',
    ': x',
    '[a]',
    '{a}',
    'a [b] {c}',
    '&anchor',
    '*alias',
    '!tag',
    '|',
    '> folded',
    "'single'",
    "it's",
    '%d',
    '@at',
    '`tick`',
    'back\\slash',
    'True',
    'FALSE',
    'no',
    'on',
    'Off',
    'y',
    'N',
    'Null',
    '123',
    '-123',
    '+123',
    '1.5',
    '.5',
    '1e3',
    'e3',
    '0o17',
    '017',
    '0b1010',
    '1_000',
    '1,000',
    '-.inf',
    '.NaN',
    '2001-12-14T21:59:43.10-05:00',
    '190:20:30',
    '1.2.3',
    '<<',
    '=',
    '---',
    '...',
    'a --- b',
    '\u0000nul',
    'bell\u0007',
    'c1\u0085',
    '\ufeffbom',
    '\ufffe',
    'lone\ud800',
    'lone\udc00',
    'cr\r\nlf',
    'emoji 😀',
    '日本語: 値',
    '{{mustache}}',
    '<b>html</b>',
  ];

  describe.each(['1.2', '1.1'] as const)('round-trips through a YAML %s parser', (version) => {
    it.each(NASTY.map((v) => [v]))('%j', (v) => {
      const fm = { title: 'T', description: v, tags: [v, 'z'], [v]: 1, kind: 'class' };
      const out = withFrontmatter('body\n', fm);
      expect(out.endsWith('\n---\n\nbody\n')).toBe(true);
      expect(yamlOf(out).split('\n').filter(Boolean)).toHaveLength(5); // one line per key
      const data = parse(yamlOf(out), { version }) as Record<string, unknown>;
      expect(data).toEqual(fm);
    });
  });

  it('quotes a description with " #" on the generated page (issue repro)', () => {
    const page = generateSite(
      makeCollection([
        {
          kind: 'namespace',
          name: 'Widget',
          longname: 'Widget',
          scope: 'global',
          comment: '/** ns */',
          description: 'See #123 for details',
        },
      ])
    ).pages.find((p) => p.slug === 'widget')!;
    expect(page.body).toContain('\ndescription: "See #123 for details"\n');
    expect((parse(yamlOf(page.body)) as Record<string, unknown>).description).toBe(
      'See #123 for details'
    );
    expect(page.frontmatter.description).toBe('See #123 for details');
  });
});
