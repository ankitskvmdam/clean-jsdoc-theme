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

  it('honors a custom indent', () => {
    const out = formatRenderError({ slug: 'x', message: 'm' }, '    ');
    expect(out).toBe('    - x: m');
  });
});
