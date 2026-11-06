import { describe, it, expect } from 'vitest';
import { formatRenderError } from '../site/render';

describe('formatRenderError', () => {
  it('prints the legacy `slug: message` form for an unpositioned error', () => {
    const out = formatRenderError({ slug: 'global', message: 'boom' });
    expect(out).toBe('  - global: boom');
  });

  it('includes the location when line (and column) are present', () => {
    const out = formatRenderError({
      slug: 'global',
      message: 'Could not parse expression with acorn',
      line: 142,
      column: 38,
    });
    expect(out).toBe('  - global (line 142:38): Could not parse expression with acorn');
  });

  it('omits the column from the location when only the line is known', () => {
    const out = formatRenderError({ slug: 'global', message: 'boom', line: 7 });
    expect(out).toBe('  - global (line 7): boom');
  });

  it('appends the snippet, indented under the header', () => {
    const out = formatRenderError({
      slug: 'global',
      message: 'boom',
      line: 3,
      column: 2,
      snippet: '2 | a\n3 | b\n  |  ^',
    });
    expect(out).toBe(
      ['  - global (line 3:2): boom', '      2 | a', '      3 | b', '        |  ^'].join('\n')
    );
  });

  it('labels the home page (empty slug) instead of printing a blank label', () => {
    const out = formatRenderError({ slug: '', message: 'boom', line: 8, column: 2 });
    expect(out).toBe('  - (home page) (line 8:2): boom');
  });

  it('labels the home page in the unpositioned form too', () => {
    expect(formatRenderError({ slug: '', message: 'boom' })).toBe('  - (home page): boom');
  });

  it('keeps a real `index` slug distinct from the home page', () => {
    expect(formatRenderError({ slug: 'index', message: 'boom' })).toBe('  - index: boom');
  });

  it('honors a custom indent', () => {
    const out = formatRenderError({ slug: 'x', message: 'm' }, '    ');
    expect(out).toBe('    - x: m');
  });
});
