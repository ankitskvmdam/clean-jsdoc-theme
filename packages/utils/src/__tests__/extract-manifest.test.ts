import { describe, it, expect } from 'vitest';
import { EXTRACT_MANIFEST_VERSION, toExtractManifest, type SiteManifest } from '../site/manifest';

const base: SiteManifest = { pages: [], nav: [], buildId: 'x' };

describe('toExtractManifest', () => {
  it('projects the manifest down to version + slots', () => {
    const slots = [{ key: 'api.X#description', sourceText: 'A', hash: 'h' }];
    expect(toExtractManifest({ ...base, slots })).toEqual({
      version: EXTRACT_MANIFEST_VERSION,
      slots,
    });
  });

  it('defaults missing slots to an empty array', () => {
    expect(toExtractManifest(base)).toEqual({ version: EXTRACT_MANIFEST_VERSION, slots: [] });
  });
});
