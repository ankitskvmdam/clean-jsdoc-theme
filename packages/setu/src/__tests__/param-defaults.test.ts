/**
 * Default values render exactly as the author wrote them, in an inline-code
 * span, on every surface that shows one: `@param` lists, `@property` lists
 * (typedefs), constructor params, and a member's `**Default:**` line. JSDoc hands
 * string defaults over as source text (quotes included) and bare literals as
 * values; JSON-stringifying the former again turned `[name=""]` into
 * `default: "\"\""`.
 */
import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { generateSite } from '../index';
import { formatDefaultValue } from '../mdast/doclet';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

/** `[raw JSDoc defaultvalue, expected markdown after "default: "]`. */
const CASES: [unknown, string][] = [
  ['""', '`""`'],
  ["''", "`''`"],
  ['"x"', '`"x"`'],
  ["'en-US'", "`'en-US'`"],
  [0, '`0`'],
  [3.5, '`3.5`'],
  [true, '`true`'],
  [false, '`false`'],
  [null, '`null`'],
  ['{}', '`{}`'],
  ['[]', '`[]`'],
  ['undefined', '`undefined`'],
  ['() => {}', '`() => {}`'],
  ['{a: 1}', '`{a: 1}`'],
  ['"{x}"', '`"{x}"`'],
  ['"<b>"', '`"<b>"`'],
  // A backtick inside widens the code-span fence instead of breaking it.
  ['"`x`"', '``"`x`"``'],
];

const params = CASES.map(([defaultvalue], i) => ({
  name: `p${i}`,
  type: { names: ['*'] },
  optional: true,
  defaultvalue,
}));

function site() {
  return generateSite(
    makeCollection([
      { kind: 'function', name: 'fn', longname: 'fn', scope: 'global', params },
      {
        kind: 'typedef',
        name: 'Shape',
        longname: 'Shape',
        scope: 'global',
        type: { names: ['Object'] },
        properties: params,
      },
      {
        kind: 'class',
        name: 'K',
        longname: 'K',
        scope: 'global',
        classdesc: '<p>K.</p>',
        params: [{ name: 'name', type: { names: ['string'] }, optional: true, defaultvalue: '""' }],
      },
      {
        kind: 'member',
        name: 'p',
        longname: 'K#p',
        memberof: 'K',
        scope: 'instance',
        description: '<p>prop</p>',
        defaultvalue: '""',
      },
    ])
  );
}

const bodyOf = (slug: string) => site().pages.find((p) => p.slug === slug)!.body;

describe('parameter / property defaults', () => {
  it.each(CASES.map(([raw, md], i) => [i, JSON.stringify(raw), md] as const))(
    'param p%i (%s) renders as %s',
    (i, _raw, md) => {
      expect(bodyOf('global')).toContain(`- \`p${i}\` (\\*, optional, default: ${md})\n`);
    }
  );

  it.each(CASES.map(([raw, md], i) => [i, JSON.stringify(raw), md] as const))(
    'typedef property p%i (%s) renders as %s',
    (i, _raw, md) => {
      expect(bodyOf('shape')).toContain(`- \`p${i}\` (\\*, optional, default: ${md})\n`);
    }
  );

  it('never re-quotes a string default (the issue repro)', () => {
    const body = bodyOf('global');
    expect(body).not.toContain('\\"');
    expect(body).not.toContain(`"''"`);
  });

  it('constructor params and a member Default line agree', () => {
    const body = bodyOf('k');
    expect(body).toContain('- `name` (string, optional, default: `""`)');
    expect(body).toContain('**Default:** `""`');
  });

  it('control: no type, no default → bare "(optional)"; no flags → no parenthetical', () => {
    const body = generateSite(
      makeCollection([
        {
          kind: 'function',
          name: 'g',
          longname: 'g',
          scope: 'global',
          params: [
            { name: 'a', optional: true },
            { name: 'b', defaultvalue: 1 },
            { name: 'c', optional: true, defaultvalue: 2 },
            { name: 'd', description: '<p>plain</p>' },
          ],
        },
      ])
    ).pages.find((p) => p.slug === 'global')!.body;
    expect(body).toContain('- `a` (optional)\n');
    expect(body).toContain('- `b` (default: `1`)\n');
    expect(body).toContain('- `c` (optional, default: `2`)\n');
    expect(body).toContain('- `d` — plain\n');
  });
});

describe('formatDefaultValue', () => {
  it('shows strings verbatim and literals as written', () => {
    expect(formatDefaultValue('""')).toBe('""');
    expect(formatDefaultValue(0)).toBe('0');
    expect(formatDefaultValue(false)).toBe('false');
    expect(formatDefaultValue(null)).toBe('null');
  });

  it('returns null when there is nothing to show', () => {
    expect(formatDefaultValue(undefined)).toBeNull();
    // An empty code span would serialize as broken markdown.
    expect(formatDefaultValue('')).toBeNull();
  });
});
