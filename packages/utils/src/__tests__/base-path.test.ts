import { describe, it, expect } from 'vitest';
import { normalizeBasePath, withBase } from '../site/base-path';

describe('normalizeBasePath', () => {
  it('returns "/" for root / empty / unset inputs', () => {
    expect(normalizeBasePath('/')).toBe('/');
    expect(normalizeBasePath('')).toBe('/');
    expect(normalizeBasePath('   ')).toBe('/');
    expect(normalizeBasePath(undefined)).toBe('/');
    expect(normalizeBasePath(null)).toBe('/');
  });

  it('strips a trailing slash from a bare path', () => {
    expect(normalizeBasePath('/doc/api/')).toBe('/doc/api');
    expect(normalizeBasePath('/doc/api')).toBe('/doc/api');
  });

  it('adds a leading slash to a slashless bare path', () => {
    expect(normalizeBasePath('doc/api')).toBe('/doc/api');
    expect(normalizeBasePath('doc/api/')).toBe('/doc/api');
  });

  it('extracts the pathname from a full URL', () => {
    expect(normalizeBasePath('https://example.com/doc/api')).toBe('/doc/api');
    expect(normalizeBasePath('https://example.com/doc/api/')).toBe('/doc/api');
    expect(normalizeBasePath('http://example.com/doc/api')).toBe('/doc/api');
  });

  it('returns "/" for a URL with no path', () => {
    expect(normalizeBasePath('https://example.com')).toBe('/');
    expect(normalizeBasePath('https://example.com/')).toBe('/');
  });

  it('handles a protocol-relative URL', () => {
    expect(normalizeBasePath('//example.com/doc/api')).toBe('/doc/api');
    expect(normalizeBasePath('//example.com')).toBe('/');
  });

  it('fails safe to "/" for non-string input', () => {
    expect(normalizeBasePath(42)).toBe('/');
    expect(normalizeBasePath({})).toBe('/');
    expect(normalizeBasePath([])).toBe('/');
  });

  it('treats a protocol-relative-looking value as a URL (host then path)', () => {
    // `//doc/api` parses as host `doc`, pathname `/api` — documented URL branch.
    expect(normalizeBasePath('//doc/api')).toBe('/api');
  });
});

describe('withBase', () => {
  it('is the identity-prefix for the default root base (backward compat)', () => {
    expect(withBase('/', '/x')).toBe('/x');
    expect(withBase('/', '/foo/bar')).toBe('/foo/bar');
    expect(withBase('/', '/_assets/search-index.abc.json')).toBe(
      '/_assets/search-index.abc.json'
    );
    // `undefined` and `''` behave like the root base too.
    expect(withBase(undefined, '/x')).toBe('/x');
    expect(withBase('', '/x')).toBe('/x');
  });

  it('prefixes a sub-directory base without double slashes', () => {
    expect(withBase('/doc/api', '/x')).toBe('/doc/api/x');
    expect(withBase('/doc/api', '/_islands')).toBe('/doc/api/_islands');
    // A trailing slash on the base is stripped before joining.
    expect(withBase('/doc/api/', '/x')).toBe('/doc/api/x');
  });

  it('adds a leading slash to a slashless path argument', () => {
    expect(withBase('/doc/api', 'x')).toBe('/doc/api/x');
    expect(withBase('/', 'x')).toBe('/x');
  });
});
