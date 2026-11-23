import { describe, it, expect } from 'vitest';
import { renderFailureMessage } from '../site/render';
import type { RenderError, RenderResult } from '../site/render';

const stats = { pageCount: 0, assetCount: 0, cssBytes: 0, jsBytes: 0, durationMs: 0 };

function result(errors: RenderError[], flagged = true): RenderResult {
  return {
    files: [],
    errors,
    ...(flagged ? { noContentRendered: { failed: errors.length, first: errors[0] } } : {}),
    stats,
  };
}

const homeError: RenderError = {
  slug: '',
  message: 'Unexpected character',
  line: 3,
  column: 5,
  snippet: '3 | See <https://example.com>\n  |     ^',
};

describe('renderFailureMessage (#401)', () => {
  it('is undefined when the result is not flagged', () => {
    expect(renderFailureMessage(result([homeError], false))).toBeUndefined();
    expect(renderFailureMessage({ files: [], stats })).toBeUndefined();
  });

  it('reports the count and the first failure with its position and snippet', () => {
    const msg = renderFailureMessage(result([homeError, { ...homeError, slug: 'guide' }]))!;
    expect(msg).toContain(
      'no page could be rendered: all 2 content page(s) failed, so nothing was written.'
    );
    expect(msg).toContain('First failure:');
    expect(msg).toContain('  - (home page) (line 3:5): Unexpected character');
    expect(msg).toContain('See <https://example.com>');
    expect(msg).toContain('This usually points at the install or the renderer, not at your docs.');
  });

  it('says all failures share the message when they do', () => {
    const msg = renderFailureMessage(result([homeError, { ...homeError, slug: 'guide' }]))!;
    expect(msg).toContain('All 2 failures share this message.');
    expect(msg).not.toContain('more page(s) failed');
  });

  it('counts the pages that failed with other errors', () => {
    const msg = renderFailureMessage(
      result([homeError, { slug: 'a', message: 'other' }, { slug: 'b', message: 'third' }])
    )!;
    expect(msg).toContain('2 more page(s) failed, not all with this message.');
    expect(msg).not.toContain('share this message');
  });

  it('adds no trailer line for a single failure', () => {
    const msg = renderFailureMessage(result([homeError]))!;
    expect(msg).toContain('all 1 content page(s) failed');
    expect(msg).not.toContain('share this message');
    expect(msg).not.toContain('more page(s) failed');
  });
});
