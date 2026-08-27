import { describe, it, expect } from 'vitest';
import { DiagnosticBag, httpOrigin, validateSiteUrl } from '../../config';

const codes = (bag: DiagnosticBag): string[] => bag.list.map((d) => d.code);

describe('httpOrigin', () => {
  it('returns the origin for http(s) URLs', () => {
    expect(httpOrigin('https://x.com')).toBe('https://x.com');
    expect(httpOrigin('https://x.com/docs/')).toBe('https://x.com');
    expect(httpOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('returns null for anything that is not an absolute http(s) URL', () => {
    expect(httpOrigin('not a url')).toBeNull();
    expect(httpOrigin('')).toBeNull();
    expect(httpOrigin('mailto:x@y.com')).toBeNull();
    expect(httpOrigin('ftp://x.com')).toBeNull();
  });
});

describe('validateSiteUrl', () => {
  it('returns undefined with no diagnostics when unset', () => {
    const bag = new DiagnosticBag();
    expect(validateSiteUrl(undefined, undefined, bag)).toBeUndefined();
    expect(bag.list).toHaveLength(0);
  });

  it('trims and returns a usable URL', () => {
    const bag = new DiagnosticBag();
    expect(validateSiteUrl('  https://x.com  ', '/', bag)).toBe('https://x.com');
    expect(bag.list).toHaveLength(0);
  });

  it('warns and returns undefined for a non-http(s), empty, or non-string value', () => {
    const bag = new DiagnosticBag();
    expect(validateSiteUrl('ftp://x.com', '/', bag)).toBeUndefined();
    expect(validateSiteUrl('', '/', bag)).toBeUndefined();
    expect(validateSiteUrl(42, '/', bag)).toBeUndefined();
    expect(codes(bag)).toEqual(['site-url/invalid', 'site-url/invalid', 'site-url/invalid']);
    expect(bag.hasErrors()).toBe(false);
  });

  it('warns when a URL path would be dropped and basePath is unset', () => {
    const bag = new DiagnosticBag();
    expect(validateSiteUrl('https://x.com/docs', undefined, bag)).toBe('https://x.com/docs');
    expect(codes(bag)).toEqual(['site-url/path-ignored']);
    expect(bag.list[0].hint).toContain('"/docs"');
  });

  it('does NOT warn about the path when basePath is set', () => {
    const bag = new DiagnosticBag();
    expect(validateSiteUrl('https://x.com/docs', '/docs/', bag)).toBe('https://x.com/docs');
    expect(bag.list).toHaveLength(0);
  });

  it('does NOT warn for a bare origin', () => {
    const bag = new DiagnosticBag();
    validateSiteUrl('https://x.com/', undefined, bag);
    expect(bag.list).toHaveLength(0);
  });
});
