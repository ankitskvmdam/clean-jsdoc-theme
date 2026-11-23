import { describe, it, expect } from 'vitest';
import { JSX_PARAGRAPH_GUARD, PASSTHROUGH_INLINE_HTML } from '../site/inline-html';

describe('PASSTHROUGH_INLINE_HTML (#360)', () => {
  it('is a list of unique, lowercase tag names', () => {
    expect(PASSTHROUGH_INLINE_HTML.length).toBeGreaterThan(0);
    for (const name of PASSTHROUGH_INLINE_HTML) expect(name).toMatch(/^[a-z]+$/);
    expect(new Set(PASSTHROUGH_INLINE_HTML).size).toBe(PASSTHROUGH_INLINE_HTML.length);
  });

  it('holds <sub> and <sup>, and none of the tags that have a Markdown form', () => {
    expect(PASSTHROUGH_INLINE_HTML).toContain('sub');
    expect(PASSTHROUGH_INLINE_HTML).toContain('sup');
    for (const name of ['a', 'b', 'strong', 'i', 'em', 'code', 'kbd', 'img', 'br']) {
      expect(PASSTHROUGH_INLINE_HTML).not.toContain(name);
    }
  });

  it('guards with U+2060 WORD JOINER, which is not whitespace', () => {
    expect(JSX_PARAGRAPH_GUARD).toBe('\u2060');
    expect(/\s/.test(JSX_PARAGRAPH_GUARD)).toBe(false);
  });
});
