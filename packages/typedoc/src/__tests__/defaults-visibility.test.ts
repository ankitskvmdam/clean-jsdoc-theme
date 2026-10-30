/**
 * TypeDoc-flavor defaults + private visibility, end to end through the real
 * converter: reflections → doclets → setu `generateSite`.
 *
 * - `@defaultValue` reaches the member `**Default:**` code span as the bare
 *   value (TypeDoc wraps the tag content in a code span or a ```ts fence, which
 *   used to show inside the span).
 * - A parameter with a complex initializer carries no default (TypeDoc's `...`
 *   placeholder used to render as `` default: `...` ``), like properties.
 * - `excludePrivate: false` → `includePrivate` for setu, so private members
 *   TypeDoc kept are documented; the default hides them as before.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Application, type CommentDisplayPart } from 'typedoc';
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';
import type { SiteManifest } from '@clean-jsdoc-theme/utils';
import { reflectionsToDoclets } from '../reflection-to-doclets';
import { defaultTagFields } from '../comment';
import { typedocVisibilityOptions } from '../write-site';

const SOURCE = `
export class Opts {
  /** Locale. @defaultValue \`'en-US'\` */
  locale = 'en-US';
  /**
   * Extra.
   * @defaultValue {}
   */
  extra: object = {};
  /**
   * Multi.
   * @defaultValue
   * \`\`\`ts
   * { a: 1, b: 2 }
   * \`\`\`
   */
  multi = { a: 1, b: 2 };
  /** N. @defaultValue 42 */
  n = 42;
  /**
   * Prose with a link.
   * @defaultValue see [docs](https://example.com) for details
   */
  prose = 1;
  /**
   * Prose with code.
   * @defaultValue \`true\` when \`x\` is set
   */
  mixed = true;
  /**
   * Backticked words.
   * @defaultValue \`one two three\`
   */
  backticked = 'one two three';
  /**
   * Two-line prose (TypeDoc fences it).
   * @defaultValue the directory
   * from which node started
   */
  cwd = '.';
  /**
   * Value with a note (examples/typedoc-basic Cache.ts).
   * @defaultValue undefined (no expiry)
   */
  ttl?: number;
  /**
   * Linked.
   * @defaultValue {@link Opts} instance
   */
  linked = 1;
}

/** Only a factory makes one. */
export class Single {
  private constructor() {}
  /** Factory. */
  static create(): Single {
    return new Single();
  }
}

/** Subclass-only construction. */
export class Guarded {
  protected constructor() {}
}

/** Implicit public constructor. */
export class Open {}

/** Greets. */
export function greet(o: { a: number } = { a: 1 }, s = 'x', arr: number[] = [1, 2]): void {}

/** Has a private member. */
export class HasPrivate {
  /** Secret field. */
  private secret = 1;
  /** Public field. */
  pub = 2;
}
`;

let tmp: string;
const posix = (p: string): string => p.split(sep).join('/');

async function build(
  extra: Record<string, unknown>
): Promise<{ manifest: SiteManifest; options: ReturnType<typeof typedocVisibilityOptions> }> {
  const app = await Application.bootstrap(
    {
      entryPoints: [posix(join(tmp, 'index.ts'))],
      tsconfig: posix(join(tmp, 'tsconfig.json')),
      skipErrorChecking: true,
      logLevel: 'Error',
      ...extra,
    },
    []
  );
  const project = await app.convert();
  if (!project) throw new Error('typedoc convert() returned undefined');
  const options = typedocVisibilityOptions(app);
  const manifest = generateSite(salty.taffy(reflectionsToDoclets(project)), {
    flavor: 'typedoc',
    ...options,
  });
  return { manifest, options };
}

const bodyOf = (m: SiteManifest, title: string): string =>
  m.pages.find((p) => p.frontmatter.title === title)?.body ?? '';

let byDefault: Awaited<ReturnType<typeof build>>;
let withPrivate: Awaited<ReturnType<typeof build>>;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-defaults-'));
  await writeFile(join(tmp, 'index.ts'), SOURCE, 'utf8');
  await writeFile(
    join(tmp, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
      },
      include: ['index.ts'],
    }),
    'utf8'
  );
  byDefault = await build({});
  withPrivate = await build({ excludePrivate: false });
}, 120_000);

afterAll(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

describe('@defaultValue on the member Default line', () => {
  it('shows the bare value, not the code span / fence TypeDoc wrapped it in', () => {
    const body = bodyOf(byDefault.manifest, 'Opts');
    expect(body).toContain("**Default:** `'en-US'`");
    expect(body).toContain('**Default:** `{}`');
    expect(body).toContain('**Default:** `{ a: 1, b: 2 }`');
    expect(body).toContain('**Default:** `42`');
    expect(body).not.toContain('```ts');
    expect(body).not.toContain("``'en-US'``");
  });

  it('content TypeDoc fences (no code of its own) is a code value, as in its theme', () => {
    const body = bodyOf(byDefault.manifest, 'Opts');
    expect(body).toContain('**Default:** `see [docs](https://example.com) for details`');
    expect(body).toContain('**Default:** `the directory from which node started`');
    expect(body).toContain('**Default:** `undefined (no expiry)`');
  });

  it('an explicit @defaultValue wins over the property initializer', () => {
    const body = bodyOf(byDefault.manifest, 'Opts');
    // `prose = 1`, `linked = 1`, `backticked = 'one two three'`, `cwd = '.'`.
    expect(body).not.toContain('**Default:** `1`');
    expect(body).not.toContain("**Default:** `'one two three'`");
    expect(body).not.toContain("**Default:** `'.'`");
  });

  it('an author code span is a code value, however many words', () => {
    expect(bodyOf(byDefault.manifest, 'Opts')).toContain('**Default:** `one two three`');
  });

  it('mixed content (code spans + text, or a link tag) renders as phrasing', () => {
    const body = bodyOf(byDefault.manifest, 'Opts');
    expect(body).toContain('**Default:** `true` when `x` is set');
    expect(body).toMatch(/\*\*Default:\*\* \[Opts\]\([^)]+\) instance/);
  });
});

describe('parameter defaults', () => {
  it("drops TypeDoc's `...` placeholder for a complex initializer, keeps a simple one", () => {
    const body = bodyOf(byDefault.manifest, 'greet');
    expect(body).not.toContain('`...`');
    expect(body).toContain("default: `'x'`");
    expect(body).toMatch(/- `o` \([^)]*\) — |- `o` \([^)]*\)\n/);
    expect(body).not.toMatch(/- `o` [^\n]*default:/);
    expect(body).not.toMatch(/- `arr` [^\n]*default:/);
  });
});

describe('constructor visibility', () => {
  it('a private constructor TypeDoc excluded leaves no Constructor section', () => {
    const body = bodyOf(byDefault.manifest, 'Single');
    expect(body).not.toContain('## Constructors');
    expect(body).not.toContain('new Single(');
    expect(body).toContain('create');
  });

  it('with excludePrivate: false the private constructor shows, badged', () => {
    const body = bodyOf(withPrivate.manifest, 'Single');
    expect(body).toContain('## Constructors');
    expect(body).toMatch(/name="constructor"[^>]*\/>\s*<MemberMeta badges="private" \/>/);
  });

  it('a protected constructor shows, badged; an implicit one shows unbadged', () => {
    expect(bodyOf(byDefault.manifest, 'Guarded')).toMatch(
      /name="constructor"[^>]*\/>\s*<MemberMeta badges="protected" \/>/
    );
    const open = bodyOf(byDefault.manifest, 'Open');
    expect(open).toContain('## Constructors');
    expect(open).not.toContain('<MemberMeta badges');
  });
});

describe('excludePrivate → setu includePrivate', () => {
  it('default (excludePrivate: true): no includePrivate, private member absent', () => {
    expect(byDefault.options).toEqual({});
    const body = bodyOf(byDefault.manifest, 'HasPrivate');
    expect(body).toContain('pub');
    expect(body).not.toContain('secret');
  });

  it('excludePrivate: false: includePrivate set, private member documented', () => {
    expect(withPrivate.options).toEqual({ includePrivate: true });
    const body = bodyOf(withPrivate.manifest, 'HasPrivate');
    expect(body).toContain('Secret field.');
    expect(body).toContain('pub');
  });
});

describe('defaultTagFields', () => {
  const code = (text: string): CommentDisplayPart => ({ kind: 'code', text });
  const txt = (text: string): CommentDisplayPart => ({ kind: 'text', text });
  const fence = (body: string): CommentDisplayPart => code(['```ts', body, '```'].join('\n'));

  it('exactly one code part is a value: unwrapped, folded, no word checks', () => {
    expect(defaultTagFields([code("`'en-US'`")])).toEqual({ defaultvalue: "'en-US'" });
    expect(defaultTagFields([code('`` a`b ``')])).toEqual({ defaultvalue: 'a`b' });
    expect(defaultTagFields([code('`one two three`')])).toEqual({ defaultvalue: 'one two three' });
    expect(defaultTagFields([fence('{}')])).toEqual({ defaultvalue: '{}' });
    expect(defaultTagFields([fence(['{', '  a: 1', '}'].join('\n'))])).toEqual({
      defaultvalue: '{ a: 1 }',
    });
    expect(defaultTagFields([fence('undefined (no expiry)')])).toEqual({
      defaultvalue: 'undefined (no expiry)',
    });
    expect(
      defaultTagFields([fence(['the directory', 'from which node started'].join('\n'))])
    ).toEqual({
      defaultvalue: 'the directory from which node started',
    });
    // Prose TypeDoc fenced stays code, exactly as TypeDoc's own theme shows it.
    expect(defaultTagFields([fence('see [docs](https://example.com) for details')])).toEqual({
      defaultvalue: 'see [docs](https://example.com) for details',
    });
  });

  it('mixed content is prose, keeping code spans and links', () => {
    expect(defaultTagFields([code('`true`'), txt(' when '), code('`x`'), txt(' is set')])).toEqual({
      defaultvaluehtml: '<p><code>true</code> when <code>x</code> is set</p>',
    });
    expect(defaultTagFields([code('`[]`'), txt(' (empty)')])).toEqual({
      defaultvaluehtml: '<p><code>[]</code> (empty)</p>',
    });
  });

  it('plain text only (jsDocCompatibility.defaultTag off): a token is a value, else prose', () => {
    expect(defaultTagFields([txt('  42 ')])).toEqual({ defaultvalue: '42' });
    expect(defaultTagFields([txt('false unless set')])).toEqual({
      defaultvaluehtml: '<p>false unless set</p>',
    });
    expect(defaultTagFields([txt('the directory\nfrom which node started')])).toEqual({
      defaultvaluehtml: '<p>the directory\nfrom which node started</p>',
    });
  });

  it('nothing to show → no fields', () => {
    expect(defaultTagFields([])).toEqual({});
    expect(defaultTagFields([txt('  ')])).toEqual({});
  });
});
