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
import { defaultTagToText } from '../comment';
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
}

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

describe('defaultTagToText', () => {
  const code = (text: string): CommentDisplayPart => ({ kind: 'code', text });
  const txt = (text: string): CommentDisplayPart => ({ kind: 'text', text });

  it('unwraps code spans (any fence length) and fenced blocks', () => {
    expect(defaultTagToText([code("`'en-US'`")])).toBe("'en-US'");
    expect(defaultTagToText([code('`` a`b ``')])).toBe('a`b');
    expect(defaultTagToText([code('```ts\n{}\n```')])).toBe('{}');
    expect(defaultTagToText([code('```\n{\n  a: 1\n}\n```')])).toBe('{ a: 1 }');
  });

  it('keeps plain text as written', () => {
    expect(defaultTagToText([txt('  42 ')])).toBe('42');
    expect(defaultTagToText([txt('see '), code('`x`')])).toBe('see x');
  });
});
