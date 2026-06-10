import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import { CodeTabs } from '../components/CodeTabs';

describe('CodeTabs', () => {
  const tabs = [
    { label: 'JS', lang: 'js', code: 'console.log("hi")' },
    { label: 'TS', lang: 'ts', code: 'const x: number = 1;' },
  ];

  it('renders a tablist with the first tab selected', () => {
    const html = render(<CodeTabs tabs={tabs} />);
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"/);
  });

  it('renders all tab labels', () => {
    const html = render(<CodeTabs tabs={tabs} />);
    expect(html).toContain('JS');
    expect(html).toContain('TS');
  });

  it('renders the active panel content in the DOM', () => {
    const html = render(<CodeTabs tabs={tabs} />);
    expect(html).toContain('language-js');
    expect(html).toContain('console.log');
  });

  it('hides the inactive panel via the hidden attribute', () => {
    const html = render(<CodeTabs tabs={tabs} />);
    // The second panel (index 1) is hidden initially.
    expect(html).toMatch(/id="code-tab-panel-1"[^>]*hidden/);
  });

  it('returns nothing when given no tabs', () => {
    const html = render(<CodeTabs tabs={[]} />);
    expect(html).toBe('');
  });
});
