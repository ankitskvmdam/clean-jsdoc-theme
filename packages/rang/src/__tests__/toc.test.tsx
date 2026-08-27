import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import type { Heading } from '@clean-jsdoc-theme/utils';
import { TOC } from '../components/TOC';
import { TocPopover } from '../components/TocPopover';

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

describe('TocPopover', () => {
  const headings: Heading[] = [
    { depth: 2, text: 'Foo', id: 'foo' },
    { depth: 3, text: 'Bar', id: 'bar' },
  ];

  it('renders anchors for every heading', () => {
    const html = render(<TocPopover headings={headings} />);
    expect(html).toContain('href="#foo"');
    expect(html).toContain('href="#bar"');
  });

  it('keeps every heading anchor unshrinkable', () => {
    // Regression guard. The list is a COLUMN flex container with a capped height
    // (`max-h-[50vh]`), so its main axis is vertical and items default to
    // `a shrink factor of 1`. `truncate` sets `overflow: hidden`, which drops each
    // item's automatic minimum size to 0 — so a long heading list squeezed every
    // row down to its 12px padding, clipping and overlapping the text instead of
    // scrolling. Layout can't be asserted here (happy-dom has no layout engine),
    // so this pins the class that prevents it.
    const html = render(<TocPopover headings={headings} />);
    const anchors = html.match(/<a [^>]*href="#(?:foo|bar)"[^>]*>/g) ?? [];
    expect(anchors).toHaveLength(2);
    for (const a of anchors) {
      expect(a).toContain('shrink-0');
      expect(a).toContain('truncate');
    }
  });

  it('caps the list height and scrolls rather than compressing rows', () => {
    const html = render(<TocPopover headings={headings} />);
    expect(html).toContain('max-h-[50vh]');
    expect(html).toContain('overflow-y-auto');
  });
});
