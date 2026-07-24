import { describe, it, expect } from 'vitest';
import { generateSite } from '../index';
import { topLevelSectionLabels } from '@clean-jsdoc-theme/utils';
import { getJSDocTaffyData } from './factory';

// `getJSDocTaffyData()` is the shared fixture collection used across the setu
// test suite (see `generate-site.test.ts`, `doclet.test.ts`, …). It carries a
// mix of classes, modules, interfaces, mixins, and typedefs, so the default
// kind-fallback grouping produces at least "Classes" and "Modules" top-level
// sidebar sections — exactly what these tests need.
describe('generateSite → collapsibleGroups', () => {
  it('defaults to every present section (option absent)', () => {
    const manifest = generateSite(getJSDocTaffyData());
    expect(manifest.collapsibleGroups).toEqual(topLevelSectionLabels(manifest.nav));
    // Sanity: the fixture actually produces more than one section.
    expect(manifest.collapsibleGroups!.length).toBeGreaterThan(1);
  });

  it('false disables all', () => {
    const manifest = generateSite(getJSDocTaffyData(), { collapsibleSidebarSections: false });
    expect(manifest.collapsibleGroups).toEqual([]);
  });

  it('array selects only exact matches present in the nav', () => {
    const manifest = generateSite(getJSDocTaffyData(), {
      collapsibleSidebarSections: ['Classes', 'Nope'],
    });
    expect(manifest.collapsibleGroups).toEqual(['Classes']);
  });
});
