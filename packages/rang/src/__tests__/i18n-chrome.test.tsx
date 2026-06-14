/**
 * Byte-identical baseline for the chrome strings the i18n refactor touches but
 * that no other test pins. Written BEFORE the `t(key)` refactor: it passes
 * against the hardcoded strings and must keep passing after, with no provider —
 * proving the default-locale (English) output is unchanged, character for
 * character, in the no-localization path.
 *
 * (Islands like ThemeToggle / Settings / CtrlK / CopyPageButton already have
 * their exact strings pinned by their own tests — those are the byte-identical
 * guard for them.)
 */
import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import type { Heading, NavNode } from '@clean-jsdoc-theme/utils';
import { Footer } from '../components/Footer';
import { PageNav } from '../components/PageNav';
import { TOC } from '../components/TOC';
import { TocPopover } from '../components/TocPopover';
import { Sidebar } from '../components/Sidebar';
import { MobileNav } from '../components/MobileNav';

const headings: Heading[] = [{ depth: 2, text: 'Foo', id: 'foo' }];
const nav: NavNode[] = [{ slug: 'a', label: 'A', group: 'Guides' }];

describe('chrome default-English strings (byte-identical baseline)', () => {
  it('Footer renders the repository link label', () => {
    const html = render(<Footer pkg={{ repository: 'https://github.com/x/y' }} />);
    expect(html).toContain('Repository');
  });

  it('PageNav renders Previous/Next and the Pagination landmark', () => {
    const html = render(
      <PageNav prev={{ slug: 'a', title: 'A' }} next={{ slug: 'b', title: 'B' }} />
    );
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain('Previous');
    expect(html).toContain('Next');
  });

  it('TOC renders the "On this page" landmark + heading', () => {
    const html = render(<TOC headings={headings} />);
    expect(html).toContain('aria-label="On this page"');
    expect(html).toContain('On this page');
  });

  it('TocPopover renders the "On this page" labels', () => {
    const html = render(<TocPopover headings={headings} />);
    expect(html).toContain('aria-label="On this page"');
    expect(html).toContain('On this page');
  });

  it('Sidebar renders the navigation landmark label', () => {
    const html = render(<Sidebar nav={nav} currentSlug="" />);
    expect(html).toContain('aria-label="Documentation navigation"');
  });

  it('MobileNav renders the trigger label + tooltip', () => {
    const html = render(<MobileNav nav={nav} currentSlug="" />);
    expect(html).toContain('aria-label="Open navigation"');
    expect(html).toContain('title="Menu"');
  });
});
