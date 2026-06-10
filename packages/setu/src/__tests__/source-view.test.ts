import { describe, it, expect } from 'vitest';
import { slugifySourcePath } from '@clean-jsdoc-theme/utils';
import {
  buildSourceModel,
  detectLanguage,
  firstCodeLine,
  type SourceFileInput,
} from '../source-view';
import { buildClassPage } from '../generate-site';
import { getJSDocTaffyData } from './factory';

const SAMPLE: SourceFileInput[] = [
  { absPath: '/repo/src/Foo.js', relPath: 'src/Foo.js', content: 'export const a = 1;' },
  {
    absPath: '/repo/lib/util/index.ts',
    relPath: 'lib/util/index.ts',
    content: 'export type T = 1;',
  },
  { absPath: '/repo/styles/main.css', relPath: 'styles/main.css', content: '.a { color: red; }' },
];

describe('slugifySourcePath (source slugs)', () => {
  it('folds extension into the segment and normalizes separators', () => {
    expect(slugifySourcePath('src/Foo.js')).toBe('src/foo-js');
    expect(slugifySourcePath('lib\\util\\index.ts')).toBe('lib/util/index-ts');
  });

  it('keeps foo.js and foo.ts distinct', () => {
    expect(slugifySourcePath('foo.js')).not.toBe(slugifySourcePath('foo.ts'));
  });
});

describe('detectLanguage', () => {
  it('maps JS-family extensions to javascript', () => {
    for (const ext of ['js', 'mjs', 'cjs', 'jsx']) {
      expect(detectLanguage(`a.${ext}`)).toBe('javascript');
    }
  });

  it('maps TS-family extensions to typescript', () => {
    for (const ext of ['ts', 'mts', 'cts', 'tsx']) {
      expect(detectLanguage(`a.${ext}`)).toBe('typescript');
    }
  });

  it('maps style + data + markup extensions', () => {
    expect(detectLanguage('a.json')).toBe('json');
    expect(detectLanguage('a.css')).toBe('css');
    expect(detectLanguage('a.scss')).toBe('scss');
    expect(detectLanguage('a.less')).toBe('less');
    expect(detectLanguage('a.html')).toBe('html');
    expect(detectLanguage('a.htm')).toBe('html');
    expect(detectLanguage('a.md')).toBe('markdown');
    expect(detectLanguage('a.markdown')).toBe('markdown');
    expect(detectLanguage('a.yml')).toBe('yaml');
    expect(detectLanguage('a.yaml')).toBe('yaml');
    expect(detectLanguage('a.vue')).toBe('vue');
    expect(detectLanguage('a.svelte')).toBe('html');
  });

  it('falls back to plaintext for unknown / extensionless', () => {
    expect(detectLanguage('a.unknownext')).toBe('plaintext');
    expect(detectLanguage('Makefile')).toBe('plaintext');
    expect(detectLanguage('.gitignore')).toBe('plaintext');
  });
});

describe('firstCodeLine', () => {
  // 1:/**  2:* doc  3:*/  4:export class Foo {  5:}
  const withComment = ['/**', ' * doc', ' */', 'export class Foo {', '}'].join('\n');

  it('skips a leading doc-comment block to the declaration', () => {
    expect(firstCodeLine(withComment, 1)).toBe(4);
  });

  it('skips blank lines between the comment and the code', () => {
    const src = ['/**', ' * doc', ' */', '', '', 'function f() {}'].join('\n');
    expect(firstCodeLine(src, 1)).toBe(6);
  });

  it('leaves a line that is already code unchanged', () => {
    expect(firstCodeLine(withComment, 4)).toBe(4);
    expect(firstCodeLine('const a = 1;', 1)).toBe(1);
  });

  it('handles a single-line block comment', () => {
    expect(firstCodeLine(['/** doc */', 'const a = 1;'].join('\n'), 1)).toBe(2);
  });

  it('falls back to lineno when out of range or unterminated', () => {
    expect(firstCodeLine('const a = 1;', 99)).toBe(99);
    expect(firstCodeLine(['/**', ' * never closes'].join('\n'), 1)).toBe(1);
  });
});

describe('buildSourceModel', () => {
  it('builds one hidden source page per input with the right slug + language', () => {
    const model = buildSourceModel(SAMPLE);
    expect(model.pages).toHaveLength(SAMPLE.length);

    const foo = model.pages.find((p) => p.frontmatter.title === 'src/Foo.js')!;
    expect(foo.slug).toBe('source/src/foo-js');
    expect(foo.frontmatter.kind).toBe('source');
    expect(foo.frontmatter.hidden).toBe(true);
    expect(foo.body).toBe('');
    expect(foo.headings).toEqual([]);
    expect(foo.mdast).toBeUndefined();
    expect(foo.source).toEqual({
      code: 'export const a = 1;',
      language: 'javascript',
      filename: 'src/Foo.js',
    });

    const ts = model.pages.find((p) => p.frontmatter.title === 'lib/util/index.ts')!;
    expect(ts.source?.language).toBe('typescript');
    const css = model.pages.find((p) => p.frontmatter.title === 'styles/main.css')!;
    expect(css.source?.language).toBe('css');
  });

  it('builds an index page listing every file, sorted, as links', () => {
    const model = buildSourceModel(SAMPLE);
    expect(model.indexPage.slug).toBe('source');
    expect(model.indexPage.frontmatter.kind).toBe('guide');
    expect(model.indexPage.frontmatter.title).toBe('Source Files');

    const body = model.indexPage.body;
    expect(body).toContain('# Source Files');
    // Links point at each file page slug (with leading + trailing slash).
    expect(body).toContain('[lib/util/index.ts](/source/lib/util/index-ts/)');
    expect(body).toContain('[src/Foo.js](/source/src/foo-js/)');
    expect(body).toContain('[styles/main.css](/source/styles/main-css/)');
    // Sorted by relPath: lib < src < styles.
    expect(body.indexOf('lib/util')).toBeLessThan(body.indexOf('src/Foo'));
    expect(body.indexOf('src/Foo')).toBeLessThan(body.indexOf('styles/main'));
  });

  it('exposes a nav node pointing at the index', () => {
    const model = buildSourceModel(SAMPLE);
    expect(model.navNode).toEqual({ label: 'Source Files', slug: 'source' });
  });

  describe('resolve(meta)', () => {
    const model = buildSourceModel(SAMPLE);

    it('resolves via meta.path + meta.filename to href + label', () => {
      const link = model.resolve({ path: '/repo/src', filename: 'Foo.js', lineno: 42 });
      expect(link).toEqual({ href: '/source/src/foo-js/#L42', label: 'Foo.js:42' });
    });

    it('normalizes backslashes in meta.path', () => {
      const link = model.resolve({ path: '\\repo\\src', filename: 'Foo.js', lineno: 7 });
      expect(link).toEqual({ href: '/source/src/foo-js/#L7', label: 'Foo.js:7' });
    });

    it('defaults lineno to 1 when absent', () => {
      const link = model.resolve({ path: '/repo/src', filename: 'Foo.js' });
      expect(link).toEqual({ href: '/source/src/foo-js/#L1', label: 'Foo.js:1' });
    });

    it('falls back to filename match when meta.path is absent', () => {
      const link = model.resolve({ filename: 'index.ts', lineno: 3 });
      expect(link).toEqual({ href: '/source/lib/util/index-ts/#L3', label: 'index.ts:3' });
    });

    it('returns null on no meta, no filename, or no match', () => {
      expect(model.resolve(undefined)).toBeNull();
      expect(model.resolve({})).toBeNull();
      expect(model.resolve({ filename: 'nope.js' })).toBeNull();
      expect(model.resolve({ path: '/elsewhere', filename: 'Other.js' })).toBeNull();
    });
  });

  describe('resolve(meta) — comment vs. code line', () => {
    // A container whose documented doclet points at its comment's first line.
    const DOCD: SourceFileInput[] = [
      {
        absPath: '/repo/src/Widget.js',
        relPath: 'src/Widget.js',
        // 1:/**  2:* doc  3:*/  4:export class Widget {  5:}
        content: ['/**', ' * A widget.', ' */', 'export class Widget {', '}'].join('\n'),
      },
    ];

    it('jumps to the declaration line by default (skips the comment)', () => {
      const model = buildSourceModel(DOCD);
      const link = model.resolve({ path: '/repo/src', filename: 'Widget.js', lineno: 1 });
      expect(link).toEqual({ href: '/source/src/widget-js/#L4', label: 'Widget.js:4' });
    });

    it('keeps the comment line when linkToComment is set (opt-out)', () => {
      const model = buildSourceModel(DOCD, { linkToComment: true });
      const link = model.resolve({ path: '/repo/src', filename: 'Widget.js', lineno: 1 });
      expect(link).toEqual({ href: '/source/src/widget-js/#L1', label: 'Widget.js:1' });
    });
  });
});

describe('buildClassPage sourceLink injection', () => {
  it('injects a Source link into the body when a resolver is given', () => {
    const sourceLink = () => ({ href: '/source/x/#L1', label: 'x.js:1' });
    const page = buildClassPage(getJSDocTaffyData(), 'DataProcessor', sourceLink)!;
    // Emitted as a <SourceLink> MDX JSX node so rang owns the (12px) caption
    // markup; the href + label round-trip verbatim as attributes.
    expect(page.body).toContain('<SourceLink');
    expect(page.body).toContain('href="/source/x/#L1"');
    expect(page.body).toContain('label="x.js:1"');
  });

  it('omits the Source link when no resolver is given', () => {
    const page = buildClassPage(getJSDocTaffyData(), 'DataProcessor')!;
    expect(page.body).not.toContain('Source:');
    expect(page.body).not.toContain('/source/x/#L1');
  });
});
