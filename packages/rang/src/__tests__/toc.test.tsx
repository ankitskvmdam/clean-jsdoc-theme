import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import type { Heading } from '@clean-jsdoc-theme/utils';
import { TOC } from '../components/TOC';

describe('TOC', () => {
  it('renders anchors for every heading', () => {
    const headings: Heading[] = [
      { depth: 2, text: 'Foo', id: 'foo' },
      { depth: 3, text: 'Bar', id: 'bar' },
    ];
    const html = render(<TOC headings={headings} />);
    expect(html).toContain('href="#foo"');
    expect(html).toContain('href="#bar"');
  });

  it('indents deeper headings further (flat list, depth-based padding)', () => {
    const headings: Heading[] = [
      { depth: 2, text: 'Foo', id: 'foo' },
      { depth: 3, text: 'Bar', id: 'bar' },
    ];
    const html = render(<TOC headings={headings} />);
    const fooIdx = html.indexOf('href="#foo"');
    const barIdx = html.indexOf('href="#bar"');
    expect(fooIdx).toBeGreaterThan(-1);
    expect(barIdx).toBeGreaterThan(fooIdx);
    // Flat list (fumadocs-style): the deeper heading is indented via a larger
    // padding-inline-start (depth 3 → 32px) than the shallower one (depth 2 → 20px).
    expect(html).toContain('padding-inline-start:20px');
    expect(html).toContain('padding-inline-start:32px');
  });

  it('returns nothing when there are no headings', () => {
    const html = render(<TOC headings={[]} />);
    expect(html).toBe('');
  });
});
