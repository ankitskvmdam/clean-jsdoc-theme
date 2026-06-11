import { describe, it, expect } from 'vitest';
import { collectUsedLangs, escapeStrayBraces, preprocessJsdocInlineTags } from '../mdx';

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
});
