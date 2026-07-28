import { describe, it, expect } from 'vitest';
import { UTILITY_CSS } from '../generated/utility-css';

describe('scrollbar CSS is gated per mode', () => {
  it('scopes styled + visible rules under the data-scrollbar attribute', () => {
    // The minifier drops the quotes around the attribute value
    // (`[data-scrollbar=styled]` rather than `[data-scrollbar='styled']`), so
    // match either quoted or unquoted form.
    expect(UTILITY_CSS).toMatch(/html\[data-scrollbar=['"]?styled['"]?\]/);
    expect(UTILITY_CSS).toMatch(/html\[data-scrollbar=['"]?visible['"]?\]/);
  });
  it('has no ungated global scrollbar-thumb rule (native must get none)', () => {
    // A bare, unscoped `::-webkit-scrollbar-thumb {` (not preceded by a
    // data-scrollbar selector) would leak styling into native mode.
    expect(UTILITY_CSS).not.toMatch(/(^|[},])\s*::-webkit-scrollbar-thumb\s*\{/);
  });
});
