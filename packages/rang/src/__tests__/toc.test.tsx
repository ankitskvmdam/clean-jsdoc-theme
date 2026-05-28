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

  it('nests deeper headings under shallower ones', () => {
    const headings: Heading[] = [
      { depth: 2, text: 'Foo', id: 'foo' },
      { depth: 3, text: 'Bar', id: 'bar' },
    ];
    const html = render(<TOC headings={headings} />);
    const fooIdx = html.indexOf('href="#foo"');
    const barIdx = html.indexOf('href="#bar"');
    expect(fooIdx).toBeGreaterThan(-1);
    expect(barIdx).toBeGreaterThan(fooIdx);
    // The deeper heading appears inside a nested container after the parent
    // anchor — `border-l` class delineates the nested list.
    const segment = html.slice(fooIdx, barIdx);
    expect(segment).toContain('border-l');
  });

  it('returns nothing when there are no headings', () => {
    const html = render(<TOC headings={[]} />);
    expect(html).toBe('');
  });
});
