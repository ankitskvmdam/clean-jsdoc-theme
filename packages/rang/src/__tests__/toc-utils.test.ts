import { describe, it, expect } from 'vitest';
import { getActiveHeadingIndex } from '../components/toc-utils';

const OFFSET = 100;

describe('getActiveHeadingIndex', () => {
  it('returns 0 for empty or single-heading pages', () => {
    expect(getActiveHeadingIndex([], 500, 2000, OFFSET)).toBe(0);
    expect(getActiveHeadingIndex([0], 500, 2000, OFFSET)).toBe(0);
  });

  it('clamps to the first heading at (or above) the top', () => {
    const tops = [0, 200, 400, 600];
    expect(getActiveHeadingIndex(tops, 0, 2000, OFFSET)).toBe(0);
    expect(getActiveHeadingIndex(tops, -50, 2000, OFFSET)).toBe(0);
  });

  it('clamps to the first heading when the page is too short to scroll', () => {
    expect(getActiveHeadingIndex([0, 300, 600], 0, 0, OFFSET)).toBe(0);
  });

  it('clamps to the last heading at the bottom', () => {
    const tops = [0, 500, 1000, 1500];
    expect(getActiveHeadingIndex(tops, 3000, 3000, OFFSET)).toBe(3);
    expect(getActiveHeadingIndex(tops, 3500, 3000, OFFSET)).toBe(3);
  });

  it('tracks the last heading past the trigger line in the middle', () => {
    const tops = [0, 500, 1000, 1500];
    // triggerLine = scrollY + offset
    expect(getActiveHeadingIndex(tops, 600, 3000, OFFSET)).toBe(1); // line 700 → past 500
    expect(getActiveHeadingIndex(tops, 1000, 3000, OFFSET)).toBe(2); // line 1100 → past 1000
    expect(getActiveHeadingIndex(tops, 1450, 3000, OFFSET)).toBe(3); // line 1550 → past 1500
  });

  describe('bottom dead zone (trailing headings shorter than the viewport)', () => {
    // The last two headings sit within the final viewport-height: their tops
    // (2050, 2150) exceed deadZoneStart = maxScroll + offset = 2100 (only 2150
    // does), so they can never reach the trigger line via a plain scan.
    const tops = [0, 500, 1950, 2050, 2150];
    const maxScroll = 2000;

    it('still uses the trigger line before the tail is reached', () => {
      expect(getActiveHeadingIndex(tops, 600, maxScroll, OFFSET)).toBe(1);
    });

    it('sweeps proportionally through the unreachable tail so it activates', () => {
      // reachScroll = tops[3] - offset = 1950 → tail sweep spans [1950, 2000].
      expect(getActiveHeadingIndex(tops, 1950, maxScroll, OFFSET)).toBe(3);
      expect(getActiveHeadingIndex(tops, 1975, maxScroll, OFFSET)).toBe(4);
      expect(getActiveHeadingIndex(tops, 1999, maxScroll, OFFSET)).toBe(4);
    });

    it('reaches the final heading where a plain trigger-line scan would get stuck', () => {
      // Sanity: a plain scan at scrollY 1999 (line 2099) lands on index 3, never 4.
      const plainScan = (() => {
        const line = 1999 + OFFSET;
        let active = 0;
        for (let i = 0; i < tops.length; i++) {
          if (tops[i] <= line) active = i;
          else break;
        }
        return active;
      })();
      expect(plainScan).toBe(3);
      // The dead-zone fallback gets us to the real last heading.
      expect(getActiveHeadingIndex(tops, 1999, maxScroll, OFFSET)).toBe(4);
    });
  });
});
