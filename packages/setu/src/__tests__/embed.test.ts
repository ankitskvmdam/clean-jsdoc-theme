import { describe, it, expect, vi, afterEach } from 'vitest';
import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import { parseEmbedConfig, type EmbedSpec } from '../embed';
import { embed } from '../mdast/builders';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseEmbedConfig', () => {
  it('parses the first token as the URL', () => {
    const spec = parseEmbedConfig('https://codepen.io/x/embed/abc');
    expect(spec).toEqual({ src: 'https://codepen.io/x/embed/abc' });
  });

  it('parses key=value pairs after the URL', () => {
    const spec = parseEmbedConfig('https://example.com height=400 width=80% aspectRatio=16/9');
    expect(spec).toEqual({
      src: 'https://example.com',
      height: 400,
      width: '80%',
      aspectRatio: '16/9',
    });
  });

  it('keeps spaces inside double-quoted values', () => {
    const spec = parseEmbedConfig('https://example.com title="Live demo here"');
    expect(spec?.title).toBe('Live demo here');
  });

  it('keeps spaces inside single-quoted values', () => {
    const spec = parseEmbedConfig("https://example.com allow='fullscreen; clipboard-write'");
    expect(spec?.allow).toBe('fullscreen; clipboard-write');
  });

  it('coerces height to a number and drops NaN', () => {
    expect(parseEmbedConfig('https://example.com height=400')?.height).toBe(400);
    const bad = parseEmbedConfig('https://example.com height=tall');
    expect(bad).toEqual({ src: 'https://example.com' });
    expect(bad?.height).toBeUndefined();
  });

  it('coerces booleans case-insensitively', () => {
    expect(parseEmbedConfig('https://example.com clickToLoad=true')?.clickToLoad).toBe(true);
    expect(parseEmbedConfig('https://example.com clickToLoad=FALSE')?.clickToLoad).toBe(false);
    expect(parseEmbedConfig('https://example.com themed=True')?.themed).toBe(true);
  });

  it('drops unparseable booleans', () => {
    const spec = parseEmbedConfig('https://example.com clickToLoad=maybe');
    expect(spec).toEqual({ src: 'https://example.com' });
  });

  it('treats a bare boolean flag (no value) as true', () => {
    const spec = parseEmbedConfig('https://example.com clickToLoad themed');
    expect(spec?.clickToLoad).toBe(true);
    expect(spec?.themed).toBe(true);
  });

  it('ignores unknown keys and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spec = parseEmbedConfig('https://example.com bogus=1 height=200');
    expect(spec).toEqual({ src: 'https://example.com', height: 200 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('bogus');
  });

  it('warns on a bare unknown flag', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spec = parseEmbedConfig('https://example.com nope');
    expect(spec).toEqual({ src: 'https://example.com' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('nope');
  });

  it('rejects http:// URLs (returns null)', () => {
    expect(parseEmbedConfig('http://example.com height=400')).toBeNull();
  });

  it('rejects other schemes and relative paths', () => {
    expect(parseEmbedConfig('javascript:alert(1)')).toBeNull();
    expect(parseEmbedConfig('ftp://example.com')).toBeNull();
    expect(parseEmbedConfig('/local/page')).toBeNull();
    expect(parseEmbedConfig('example.com')).toBeNull();
  });

  it('accepts protocol-relative // URLs', () => {
    const spec = parseEmbedConfig('//example.com/embed height=300');
    expect(spec).toEqual({ src: '//example.com/embed', height: 300 });
  });

  it('returns null on empty or whitespace-only input', () => {
    expect(parseEmbedConfig('')).toBeNull();
    expect(parseEmbedConfig('   \n\t  ')).toBeNull();
  });

  it('returns null for non-string input without throwing', () => {
    // @ts-expect-error — exercising runtime robustness
    expect(parseEmbedConfig(undefined)).toBeNull();
    // @ts-expect-error — exercising runtime robustness
    expect(parseEmbedConfig(null)).toBeNull();
  });

  it('tolerates leading/trailing whitespace around the config', () => {
    const spec = parseEmbedConfig('   https://example.com height=400   ');
    expect(spec).toEqual({ src: 'https://example.com', height: 400 });
  });

  it('tolerates a multi-line fence body (newlines as delimiters)', () => {
    const body = `
      https://example.com
      height=400
      title="Spread across lines"
      clickToLoad=true
    `;
    const spec = parseEmbedConfig(body);
    expect(spec).toEqual({
      src: 'https://example.com',
      height: 400,
      title: 'Spread across lines',
      clickToLoad: true,
    });
  });

  it('collapses runs of whitespace between tokens', () => {
    const spec = parseEmbedConfig('https://example.com    height=400\t\twidth=100%');
    expect(spec).toEqual({ src: 'https://example.com', height: 400, width: '100%' });
  });
});

describe('embed() builder', () => {
  /** Map a builder result's attributes to a { name: value } record. */
  function attrMap(spec: EmbedSpec): Record<string, string> {
    const node = embed(spec);
    const out: Record<string, string> = {};
    for (const a of node.attributes as MdxJsxAttribute[]) {
      out[a.name] = a.value as string;
    }
    return out;
  }

  it('produces a self-closing capitalized Embed JSX flow element', () => {
    const node = embed({ src: 'https://example.com' });
    expect(node.type).toBe('mdxJsxFlowElement');
    expect(node.name).toBe('Embed');
    expect(node.children).toEqual([]);
  });

  it('emits one attribute for src only when nothing else is set', () => {
    const node = embed({ src: 'https://example.com' });
    expect(node.attributes).toHaveLength(1);
    expect(node.attributes[0]).toEqual({
      type: 'mdxJsxAttribute',
      name: 'src',
      value: 'https://example.com',
    });
  });

  it('stringifies number and boolean attribute values', () => {
    const attrs = attrMap({
      src: 'https://example.com',
      height: 400,
      clickToLoad: true,
      themed: false,
    });
    expect(attrs.height).toBe('400');
    expect(attrs.clickToLoad).toBe('true');
    expect(attrs.themed).toBe('false');
  });

  it('emits every defined field and omits undefined ones', () => {
    const attrs = attrMap({
      src: 'https://example.com',
      title: 'Demo',
      width: '100%',
      aspectRatio: '16/9',
      allow: 'fullscreen',
      sandbox: 'allow-scripts',
      height: 400,
      clickToLoad: true,
      themed: true,
    });
    expect(attrs).toEqual({
      src: 'https://example.com',
      title: 'Demo',
      width: '100%',
      aspectRatio: '16/9',
      allow: 'fullscreen',
      sandbox: 'allow-scripts',
      height: '400',
      clickToLoad: 'true',
      themed: 'true',
    });

    const sparse = embed({ src: 'https://example.com', title: 'Only title' });
    expect((sparse.attributes as MdxJsxAttribute[]).map((a) => a.name)).toEqual(['src', 'title']);
  });
});
