import { describe, it, expect } from 'vitest';
import { render } from '../index';
import { minimalTheme } from './fixtures';
import type { OutputFile, SiteManifest, ThemeConfig } from '@clean-jsdoc-theme/utils';

// setu now lowers a ```js playground fence in place inside lists, blockquotes and
// <details> (#362). These bodies are setu's exact MDX for such fences; the card
// must render inside its container, and a list must stay one list.

const LIST_BODY =
  '- first item\n\n' +
  '  <Playground providers="codepen">\n    ```js\n    if (x) {\n      run();\n    }\n    ```\n  </Playground>\n\n' +
  '- second item\n';

const QUOTE_BODY =
  '> quote\n>\n> <Playground providers="codepen">\n>   ```js\n>   run();\n>   ```\n> </Playground>\n';

const DETAILS_BODY =
  '<details>\n  <summary>More</summary>\n\n' +
  '  <Playground providers="codepen">\n    ```js\n    run();\n    ```\n  </Playground>\n</details>\n';

const TIGHT_ORDERED_BODY =
  '1. text\n   <Playground providers="codepen">\n     ```js\n     run();\n     ```\n   </Playground>\n1. next\n';

const theme: ThemeConfig = { ...minimalTheme, playground: { enabled: true } };

function asString(file: OutputFile): string {
  return typeof file.contents === 'string'
    ? file.contents
    : new TextDecoder().decode(file.contents);
}

async function renderBody(body: string): Promise<string> {
  const manifest: SiteManifest = {
    pages: [
      {
        slug: 'demo',
        frontmatter: { title: 'Demo', kind: 'guide', description: 'Nested playground.' },
        body,
        headings: [],
      },
    ],
    nav: [{ label: 'Demo', slug: 'demo' }],
    pkg: { name: 'test-pkg', version: '1.0.0' },
    buildId: 'test-build-pg-nested',
  };
  const result = await render(manifest, { theme });
  return asString(result.files.find((f) => f.path === 'demo/index.html')!);
}

/** The `<main>` page content (skips chrome such as nav lists). */
function content(html: string): string {
  const start = html.indexOf('<main');
  return html.slice(start, html.indexOf('</main>', start));
}

describe('render() — playground nested in a container (#362)', () => {
  it('renders the card inside the list item and keeps one list', async () => {
    const html = content(await renderBody(LIST_BODY));
    const island = html.indexOf('data-island="playground"');
    expect(island).toBeGreaterThan(-1);
    const firstLi = html.indexOf('<li');
    const firstLiEnd = html.indexOf('</li>', firstLi);
    expect(firstLi).toBeLessThan(island);
    expect(island).toBeLessThan(firstLiEnd);
    // The second item follows in the same list.
    const rest = html.slice(firstLiEnd);
    expect(rest).toMatch(/^<\/li>\s*<li[^>]*>[\s\S]*second item/);
    expect(html.match(/<ul\b/g)).toHaveLength(1);
    // The code's inner indentation survives.
    const text = html.replace(/<span style="[^"]*">|<\/span>/g, '');
    expect(text).toContain('\n<span class="line">  run();\n<span class="line">}');
  });

  it('renders the card inside a tight ordered item and keeps one list', async () => {
    const html = content(await renderBody(TIGHT_ORDERED_BODY));
    const island = html.indexOf('data-island="playground"');
    const firstLi = html.indexOf('<li');
    expect(firstLi).toBeGreaterThan(-1);
    expect(firstLi).toBeLessThan(island);
    expect(island).toBeLessThan(html.indexOf('</li>', firstLi));
    expect(html.match(/<ol\b/g)).toHaveLength(1);
    expect(html).toContain('next');
  });

  // A fence under a phrasing-only HTML parent stays code (setu's exact MDX, see
  // setu's playground-prose test): the page must still render.
  it.each([
    ['td', '|                  |\n| ---------------- |\n| ```js\nrun();\n``` |\n'],
    ['h2', '## ```js\nrun();\n```\n'],
    ['strong', '**```js\nrun();\n```**\n'],
    ['a', '<Playground providers="codepen">\n  ```js\n  run();\n  ```\n</Playground>\n'],
  ])('renders the page for a fence that was under <%s>', async (_name, body) => {
    const html = content(await renderBody(body));
    expect(html).toContain('run');
  });

  it('renders the card inside the blockquote', async () => {
    const html = content(await renderBody(QUOTE_BODY));
    const open = html.indexOf('<blockquote');
    const island = html.indexOf('data-island="playground"');
    expect(open).toBeGreaterThan(-1);
    expect(open).toBeLessThan(island);
    expect(island).toBeLessThan(html.indexOf('</blockquote>'));
  });

  it('renders the card inside <details>', async () => {
    const html = content(await renderBody(DETAILS_BODY));
    const open = html.indexOf('<details');
    const island = html.indexOf('data-island="playground"');
    expect(open).toBeGreaterThan(-1);
    expect(open).toBeLessThan(island);
    expect(island).toBeLessThan(html.indexOf('</details>'));
  });
});
