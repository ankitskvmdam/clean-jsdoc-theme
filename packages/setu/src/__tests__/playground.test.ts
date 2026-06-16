import { describe, it, expect, vi, afterEach } from 'vitest';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { TDoclet } from '@clean-jsdoc-theme/utils';
import {
  KNOWN_PROVIDERS,
  parsePlaygroundSpec,
  resolvePlaygroundOpts,
  type PlaygroundOpts,
} from '../playground';
import { makePlaygroundResolver } from '../generate-site';
import { code, playground } from '../mdast/builders';
import { examplesBlocks } from '../mdast/doclet';
import { toMdx } from '../mdx';
import { root } from '../mdast/builders';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parsePlaygroundSpec', () => {
  it('parses bare provider tokens in author order, de-duped', () => {
    const spec = parsePlaygroundSpec('jsfiddle codepen codepen');
    expect(spec.providers).toEqual(['jsfiddle', 'codepen']);
    expect(spec.off).toBe(false);
  });

  it('leaves providers null for a bare tag (no provider tokens)', () => {
    const spec = parsePlaygroundSpec('');
    expect(spec.providers).toBeNull();
    expect(spec).toEqual({ off: false, providers: null, highlight: [] });
  });

  it('records none/off as an opt-out', () => {
    expect(parsePlaygroundSpec('none').off).toBe(true);
    expect(parsePlaygroundSpec('off').off).toBe(true);
  });

  it('reads filename', () => {
    expect(parsePlaygroundSpec('codepen filename=resize.js').filename).toBe('resize.js');
  });

  it('keeps spaces in a quoted filename', () => {
    expect(parsePlaygroundSpec('filename="my file.js"').filename).toBe('my file.js');
  });

  it('parses highlight as 1,4,8', () => {
    expect(parsePlaygroundSpec('highlight=1,4,8').highlight).toEqual([1, 4, 8]);
  });

  it('parses highlight as [1,4,8] (brackets stripped)', () => {
    expect(parsePlaygroundSpec('highlight=[1,4,8]').highlight).toEqual([1, 4, 8]);
  });

  it('sorts, de-dupes, and drops non-positive/non-integer highlight entries', () => {
    expect(parsePlaygroundSpec('highlight=8,1,4,1,0,-3,foo').highlight).toEqual([1, 4, 8]);
  });

  it('warns on an unknown bare token and ignores it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spec = parsePlaygroundSpec('codepen bogus');
    expect(spec.providers).toEqual(['codepen']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('bogus');
  });

  it('warns on an unknown config key and ignores it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spec = parsePlaygroundSpec('codepen nope=1');
    expect(spec.providers).toEqual(['codepen']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('nope');
  });

  it('does not throw on non-string input', () => {
    // @ts-expect-error — exercising runtime robustness
    expect(parsePlaygroundSpec(undefined)).toEqual({ off: false, providers: null, highlight: [] });
  });
});

describe('resolvePlaygroundOpts', () => {
  it('falls back to the default providers for a bare spec', () => {
    const opts = resolvePlaygroundOpts(parsePlaygroundSpec(''), KNOWN_PROVIDERS);
    expect(opts).toEqual({ providers: [...KNOWN_PROVIDERS], filename: undefined, highlight: [] });
  });

  it('uses the explicit provider list as-is', () => {
    const opts = resolvePlaygroundOpts(parsePlaygroundSpec('codepen'), KNOWN_PROVIDERS);
    expect(opts?.providers).toEqual(['codepen']);
  });

  it('returns null for an off spec with no presentation options', () => {
    expect(resolvePlaygroundOpts(parsePlaygroundSpec('off'), KNOWN_PROVIDERS)).toBeNull();
  });

  it('still wraps an off spec that carries filename/highlight (empty providers)', () => {
    const opts = resolvePlaygroundOpts(parsePlaygroundSpec('off filename=x.js highlight=2'), KNOWN_PROVIDERS);
    expect(opts).toEqual({ providers: [], filename: 'x.js', highlight: [2] });
  });
});

describe('playground() builder', () => {
  const attrMap = (node: MdxJsxFlowElement): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const a of node.attributes as MdxJsxAttribute[]) out[a.name] = a.value as string;
    return out;
  };

  it('wraps the code child in a capitalized Playground JSX element', () => {
    const child = code('js', 'resize(img, 200);');
    const node = playground({ providers: ['codepen'], highlight: [] }, child);
    expect(node.type).toBe('mdxJsxFlowElement');
    expect(node.name).toBe('Playground');
    expect(node.children).toEqual([child]);
  });

  it('emits providers (space-joined), filename, and highlight (comma-joined)', () => {
    const node = playground(
      { providers: ['codepen', 'jsfiddle'], filename: 'resize.js', highlight: [1, 4, 8] },
      code('js', 'x')
    );
    expect(attrMap(node)).toEqual({
      providers: 'codepen jsfiddle',
      filename: 'resize.js',
      highlight: '1,4,8',
    });
  });

  it('omits empty providers/highlight and an absent filename', () => {
    const node = playground({ providers: [], highlight: [] }, code('js', 'x'));
    expect(node.attributes).toHaveLength(0);
  });
});

describe('examplesBlocks playground wrapping', () => {
  const docletWith = (examples: string[]): TDoclet =>
    ({ longname: 'x', examples } as unknown as TDoclet);

  it('wraps each example in <Playground> when opts are given', () => {
    const opts: PlaygroundOpts = { providers: ['codepen'], highlight: [] };
    const blocks = examplesBlocks(docletWith(['a();', 'b();']), 'js', undefined, opts);
    expect(blocks).toHaveLength(2);
    expect((blocks[0] as MdxJsxFlowElement).name).toBe('Playground');
    expect((blocks[1] as MdxJsxFlowElement).name).toBe('Playground');
  });

  it('emits bare code nodes when no opts are given (byte-identical default)', () => {
    const blocks = examplesBlocks(docletWith(['a();']), 'js');
    expect(blocks).toEqual([code('js', 'a();')]);
  });

  it('keeps a caption paragraph outside the wrapper', () => {
    const opts: PlaygroundOpts = { providers: ['codepen'], highlight: [] };
    const blocks = examplesBlocks(docletWith(['<caption>Resize</caption>\nresize();']), 'js', undefined, opts);
    expect(blocks).toHaveLength(2);
    expect((blocks[0] as { type: string }).type).toBe('paragraph');
    expect((blocks[1] as MdxJsxFlowElement).name).toBe('Playground');
  });
});

describe('makePlaygroundResolver', () => {
  const docletWithTag = (text: string): TDoclet =>
    ({ longname: 'x', tags: [{ title: 'playground', text }] } as unknown as TDoclet);

  it('returns undefined when there is no config (feature off)', () => {
    expect(makePlaygroundResolver(undefined)).toBeUndefined();
  });

  it('uses an explicit tag provider list', () => {
    const resolve = makePlaygroundResolver({})!;
    expect(resolve(docletWithTag('codepen'))?.providers).toEqual(['codepen']);
  });

  it('falls back to the default providers for a bare @playground tag', () => {
    const resolve = makePlaygroundResolver({ providers: ['jsfiddle'] })!;
    expect(resolve(docletWithTag(''))?.providers).toEqual(['jsfiddle']);
  });

  it('opts out on @playground none', () => {
    const resolve = makePlaygroundResolver({})!;
    expect(resolve(docletWithTag('none'))).toBeNull();
  });

  it('enableForAllExamples wraps a doclet with no tag', () => {
    const resolve = makePlaygroundResolver({ enableForAllExamples: true, providers: ['codepen'] })!;
    const doclet = { longname: 'y' } as unknown as TDoclet;
    expect(resolve(doclet)).toEqual({ providers: ['codepen'], highlight: [] });
  });

  it('returns null for an untagged doclet when enableForAllExamples is off', () => {
    const resolve = makePlaygroundResolver({})!;
    expect(resolve({ longname: 'z' } as unknown as TDoclet)).toBeNull();
  });
});

describe('toMdx round-trip', () => {
  it('serializes a <Playground> wrapper with its fenced code child', () => {
    const tree = root(
      playground({ providers: ['codepen', 'jsfiddle'], filename: 'r.js', highlight: [1, 3] }, code('js', 'resize();'))
    );
    const body = toMdx(tree, { frontmatter: { title: 'X', kind: 'class' } });
    expect(body).toContain('<Playground');
    expect(body).toContain('providers="codepen jsfiddle"');
    expect(body).toContain('filename="r.js"');
    expect(body).toContain('highlight="1,3"');
    expect(body).toContain('```js');
    expect(body).toContain('resize();');
  });
});
