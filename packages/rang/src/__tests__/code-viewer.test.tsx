import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import { CodeViewer } from '../components/CodeViewer';

describe('CodeViewer', () => {
  const code = 'const x = 1;\nconsole.log(x);';

  it('renders the SSR <pre> fallback with the code', () => {
    const html = render(<CodeViewer code={code} language="javascript" />);
    expect(html).toContain('<pre');
    expect(html).toContain('const x = 1;');
    expect(html).toContain('console.log(x)');
    expect(html).toContain('language-javascript');
  });

  it('renders the filename header and language hint when given', () => {
    const html = render(<CodeViewer code={code} language="javascript" filename="index.js" />);
    expect(html).toContain('index.js');
    expect(html).toContain('javascript');
  });

  it('omits the header bar when no filename is given', () => {
    const html = render(<CodeViewer code={code} language="javascript" />);
    expect(html).not.toContain('border-b');
  });
});
