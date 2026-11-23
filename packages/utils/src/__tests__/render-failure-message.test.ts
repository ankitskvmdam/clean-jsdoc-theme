import { describe, it, expect } from 'vitest';
import { renderFailureMessage } from '../site/render';
import type { RenderError, RenderResult } from '../site/render';

const stats = { pageCount: 0, assetCount: 0, cssBytes: 0, jsBytes: 0, durationMs: 0 };

/**
 * A result flagged with the given counted (content) failures. `extra` are
 * failures render() also reports but doesn't count (e.g. a source viewer), so
 * `errors.length !== failed` — the message must only use the counted set.
 */
function result(counted: RenderError[], extra: RenderError[] = []): RenderResult {
  const first = counted[0];
  return {
    files: [],
    errors: [...counted, ...extra],
    noContentRendered: {
      failed: counted.length,
      first,
      sameMessage: counted.filter((e) => e.message === first.message).length,
    },
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
const sourceError: RenderError = { slug: 'source/a-js', message: homeError.message };
const HINT = 'This usually points at the install or the renderer, not at your docs.';

describe('renderFailureMessage (#401)', () => {
  it('is undefined when the result is not flagged', () => {
    expect(renderFailureMessage({ files: [], errors: [homeError], stats })).toBeUndefined();
    expect(renderFailureMessage({ files: [], stats })).toBeUndefined();
  });

  it('reports the count and the first failure with its position and snippet', () => {
    const msg = renderFailureMessage(result([homeError, { ...homeError, slug: 'guide' }]))!;
    expect(msg).toContain(
      'no page could be rendered: all 2 content page(s) failed, so this site was not written.'
    );
    expect(msg).toContain('First failure:');
    expect(msg).toContain('  - (home page) (line 3:5): Unexpected character');
    expect(msg).toContain('See <https://example.com>');
  });

  it('counts only the counted failures, not every reported error', () => {
    // 2 content failures + 1 source-viewer failure with the same message.
    const msg = renderFailureMessage(
      result([homeError, { ...homeError, slug: 'guide' }], [sourceError])
    )!;
    expect(msg).toContain('all 2 content page(s) failed');
    expect(msg).toContain('All 2 failures share this message.');
    expect(msg).not.toContain('All 3');
    expect(msg).toContain(HINT);
  });

  it('counts the pages that failed with other errors, without the hint', () => {
    const msg = renderFailureMessage(
      result(
        [homeError, { slug: 'a', message: 'other' }, { slug: 'b', message: 'third' }],
        [sourceError]
      )
    )!;
    expect(msg).toContain('2 more page(s) failed, not all with this message.');
    expect(msg).not.toContain('share this message');
    expect(msg).not.toContain(HINT);
  });

  it('adds neither a trailer nor the hint for a single failure', () => {
    const msg = renderFailureMessage(result([homeError]))!;
    expect(msg).toContain('all 1 content page(s) failed');
    expect(msg).not.toContain('share this message');
    expect(msg).not.toContain('more page(s) failed');
    expect(msg).not.toContain(HINT);
  });
});
