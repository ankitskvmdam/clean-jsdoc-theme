import { describe, it, expect, afterEach } from 'vitest';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { render as mount, fireEvent, cleanup } from '@testing-library/preact';
import { decompressFromBase64 } from 'lz-string';
import { CodeBlock } from '../components/CodeBlock';
import { Playground } from '../components/Playground';
import { PlaygroundMenu } from '../components/PlaygroundMenu';
import { SimpleIcon } from '../components/SimpleIcon';
import { buildCodepenForm } from '../components/playground/codepen';
import { buildJsfiddleForm } from '../components/playground/jsfiddle';
import { buildCodesandboxParameters } from '../components/playground/codesandbox';

/** A Shiki-style `<code>` child: line spans separated by "\n" text nodes. */
function shikiCode(lines: string[]) {
  const kids: unknown[] = [];
  lines.forEach((l, i) => {
    if (i > 0) kids.push('\n');
    kids.push(h('span', { class: 'line' }, l));
  });
  return h('code', { class: 'language-js' }, kids);
}

describe('provider payload builders', () => {
  it('CodePen: code becomes `js`, options ride along, js wins over options', () => {
    const { action, fields } = buildCodepenForm('resize(img, 200)', {
      js_external: 'https://x/y.js',
      js_pre_processor: 'babel',
      js: 'IGNORED',
    });
    expect(action).toBe('https://codepen.io/pen/define');
    const data = JSON.parse(fields.data);
    expect(data.js).toBe('resize(img, 200)');
    expect(data.js_external).toBe('https://x/y.js');
    expect(data.js_pre_processor).toBe('babel');
    expect(data.title).toBe('Example');
  });

  it('JSFiddle: string fields, resources/wrap defaults', () => {
    const a = buildJsfiddleForm('doThing()', { resources: 'a.js,b.js', wrap: 'h' });
    expect(a.action).toBe('https://jsfiddle.net/api/post/library/pure/');
    expect(a.fields.js).toBe('doThing()');
    expect(a.fields.resources).toBe('a.js,b.js');
    expect(a.fields.wrap).toBe('h');
    // default wrap is `b` (onLoad) and non-string options are dropped to ''.
    const b = buildJsfiddleForm('x', { html: 123 as unknown as string });
    expect(b.fields.wrap).toBe('b');
    expect(b.fields.html).toBe('');
  });

  it('CodeSandbox: LZ-string parameters carry index.js + package.json deps', () => {
    const params = buildCodesandboxParameters('console.log(1)', {
      dependencies: { lodash: '^4' },
    });
    const decoded = JSON.parse(decompressFromBase64(params)!);
    expect(decoded.files['index.js'].content).toBe('console.log(1)');
    expect(JSON.parse(decoded.files['package.json'].content).dependencies).toEqual({
      lodash: '^4',
    });
  });
});

describe('SimpleIcon', () => {
  it('masks the Simple Icons CDN glyph over the fg token', () => {
    const html = render(h(SimpleIcon, { slug: 'codepen' }));
    expect(html).toContain('cdn.simpleicons.org/codepen');
    expect(html).toContain('bg-(--clean-fg)');
    expect(html).toContain('aria-hidden="true"');
  });
});

describe('CodeBlock header (no playground)', () => {
  it('shows the CODE label + copy island, and no playground marker', () => {
    const html = render(h(CodeBlock, { children: shikiCode(['a()']) }));
    expect(html).toContain('CODE');
    expect(html).toContain('data-island="copy-btn"');
    expect(html).toContain('data-code-card');
    expect(html).not.toContain('data-island="playground"');
  });

  it('unbordered mode renders no header (CodeTabs panel parity)', () => {
    const html = render(h(CodeBlock, { code: 'a()', lang: 'js', bordered: false }));
    expect(html).not.toContain('data-code-card');
    expect(html).toContain('data-island="copy-btn"'); // floating copy preserved
  });
});

describe('CodeBlock under <Playground>', () => {
  it('uses the filename as the header label and emits the playground marker', () => {
    const html = render(
      h(
        Playground,
        { providers: 'codepen jsfiddle', filename: 'resize.js' },
        h(CodeBlock, { children: shikiCode(['resize()']) })
      )
    );
    expect(html).toContain('resize.js');
    expect(html).not.toMatch(/>\s*CODE\s*</); // filename replaces the CODE label
    expect(html).toContain('data-island="playground"');
    expect(html).toContain('data-providers="codepen jsfiddle"');
    expect(html).toContain('Open Code in');
  });

  it('highlights only the requested 1-based lines', () => {
    const html = render(
      h(
        Playground,
        { providers: 'codepen', highlight: '2' },
        h(CodeBlock, { children: shikiCode(['one', 'two', 'three']) })
      )
    );
    // Exactly one line marked (the tint colour is applied by dwar's CSS layer
    // off this attribute, not a class here).
    expect(html.match(/data-highlighted/g)?.length).toBe(1);
    // The marked line is the second one.
    expect(html).toMatch(/data-highlighted[^>]*>two</);
  });

  it('no providers → no dropdown, but filename/highlight still apply', () => {
    const html = render(
      h(
        Playground,
        { providers: '', filename: 'x.js', highlight: '1' },
        h(CodeBlock, { children: shikiCode(['only']) })
      )
    );
    expect(html).toContain('x.js');
    expect(html).not.toContain('data-island="playground"');
    expect(html).toContain('data-highlighted');
  });
});

describe('PlaygroundMenu', () => {
  afterEach(cleanup);

  it('renders just the trigger when closed (SSR)', () => {
    const html = render(h(PlaygroundMenu, { providers: ['codepen', 'codesandbox'] }));
    expect(html).toContain('Open Code in');
    // The menu items live in the closed dropdown content, which renders nothing.
    expect(html).not.toContain('Open in CodePen');
  });

  it('reveals one item per provider when opened', async () => {
    const { getByLabelText, findByText, queryByText } = mount(
      h(PlaygroundMenu, { providers: ['codepen', 'codesandbox'] })
    );
    fireEvent.click(getByLabelText('Open Code in'));
    expect(await findByText('Open in CodePen')).toBeTruthy();
    expect(await findByText('Open in CodeSandbox')).toBeTruthy();
    expect(queryByText('Open in JSFiddle')).toBeNull();
  });

  it('renders nothing with no providers', () => {
    expect(render(h(PlaygroundMenu, { providers: [] }))).toBe('');
  });
});
