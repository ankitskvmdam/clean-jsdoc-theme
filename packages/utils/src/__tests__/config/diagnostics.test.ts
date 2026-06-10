import { describe, it, expect } from 'vitest';
import { DiagnosticBag, formatDiagnostics } from '../../config/diagnostics';

describe('DiagnosticBag', () => {
  it('collects diagnostics in insertion order via add()', () => {
    const bag = new DiagnosticBag();
    bag.add({ level: 'info', code: 'a/one', message: 'first' });
    bag.add({ level: 'warning', code: 'a/two', message: 'second' });
    expect(bag.list).toHaveLength(2);
    expect(bag.list[0].message).toBe('first');
    expect(bag.list[1].code).toBe('a/two');
  });

  it('level helpers set the right level + carry hint/path', () => {
    const bag = new DiagnosticBag();
    bag.error('opts/bad', 'broken', { hint: 'use a string', path: 'siteName' });
    bag.warning('opts/odd', 'odd');
    bag.info('opts/fyi', 'fyi');

    const [err, warn, info] = bag.list;
    expect(err.level).toBe('error');
    expect(err.hint).toBe('use a string');
    expect(err.path).toBe('siteName');
    expect(warn.level).toBe('warning');
    expect(info.level).toBe('info');
  });

  it('hasErrors() is true only when an error was added', () => {
    const bag = new DiagnosticBag();
    expect(bag.hasErrors()).toBe(false);
    bag.warning('w', 'just a warning');
    bag.info('i', 'just info');
    expect(bag.hasErrors()).toBe(false);
    bag.error('e', 'real problem');
    expect(bag.hasErrors()).toBe(true);
  });
});

describe('formatDiagnostics', () => {
  it('groups by level (errors first), includes code, path, and hint lines', () => {
    const bag = new DiagnosticBag();
    bag.info('fonts/unknown', 'could not verify "Foo"');
    bag.error('siteName/bad', 'expected a string', {
      hint: 'use a string path/URL',
      path: 'siteName.default',
    });

    const out = formatDiagnostics(bag);
    const lines = out.split('\n');

    // Error group renders before the info group despite insertion order.
    expect(lines[0]).toContain('error');
    expect(lines[0]).toContain('expected a string');
    expect(lines[0]).toContain('(siteName.default)');
    expect(lines[0]).toContain('[siteName/bad]');
    expect(lines[1]).toContain('→ use a string path/URL');
    expect(lines.some((l) => l.includes('info') && l.includes('could not verify'))).toBe(true);
  });

  it('emits no color escapes by default and ANSI escapes when color:true', () => {
    const bag = new DiagnosticBag();
    bag.warning('opts/unknown-key', 'unknown key "siteNme"');

    const plain = formatDiagnostics(bag);
    // eslint-disable-next-line no-control-regex
    expect(plain).not.toMatch(/\x1b\[/);

    const colored = formatDiagnostics(bag, { color: true });
    // eslint-disable-next-line no-control-regex
    expect(colored).toMatch(/\x1b\[/);
  });

  it('returns empty string for an empty bag', () => {
    expect(formatDiagnostics(new DiagnosticBag())).toBe('');
  });
});
