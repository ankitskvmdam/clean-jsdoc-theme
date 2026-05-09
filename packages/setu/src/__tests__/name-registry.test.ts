import { describe, it, expect } from 'vitest';
import { NameRegistry } from '../name-registry';

describe('NameRegistry#makeUnique', () => {
  it('returns the input unchanged for an empty registry', () => {
    const registry = new NameRegistry();
    expect(registry.makeUnique('foo')).toBe('foo');
  });

  it('appends _1 when the input is already taken', () => {
    const registry = new NameRegistry();
    registry.makeUniqueName('foo');
    expect(registry.makeUnique('foo')).toBe('foo_1');
  });

  it('keeps bumping past multiple taken slots', () => {
    const registry = new NameRegistry();
    registry.makeUniqueName('foo');
    registry.makeUniqueName('foo_1');
    registry.makeUniqueName('foo_2');
    expect(registry.makeUnique('foo')).toBe('foo_3');
  });

  it('returns the lowest free slot rather than skipping gaps', () => {
    const registry = new NameRegistry();
    registry.makeUniqueName('foo');
    registry.makeUniqueName('foo_2');
    expect(registry.makeUnique('foo')).toBe('foo_1');
  });

  it('does not mutate the registry', () => {
    const registry = new NameRegistry();
    registry.makeUniqueName('foo');
    registry.makeUnique('foo');
    // A subsequent call should still bump from the same baseline.
    expect(registry.makeUnique('foo')).toBe('foo_1');
  });

  it('handles an empty input string', () => {
    const registry = new NameRegistry();
    expect(registry.makeUnique('')).toBe('');
  });
});

describe('NameRegistry#makeUniqueName', () => {
  it('returns a sanitized name on first call', () => {
    const registry = new NameRegistry();
    expect(registry.makeUniqueName('a/b/c.ts')).toBe('a_b_c.ts');
  });

  it('sanitizes JSDoc-style separators', () => {
    const registry = new NameRegistry();
    expect(registry.makeUniqueName('module:foo~Bar#method')).toBe('module_foo_Bar_method');
  });

  it('appends _1 on a second call with the same input', () => {
    const registry = new NameRegistry();
    registry.makeUniqueName('repeat');
    expect(registry.makeUniqueName('repeat')).toBe('repeat_1');
  });

  it('produces distinct names for inputs that sanitize to the same value', () => {
    const registry = new NameRegistry();
    expect(registry.makeUniqueName('foo:bar')).toBe('foo_bar');
    expect(registry.makeUniqueName('foo/bar')).toBe('foo_bar_1');
  });

  it('keeps bumping past multiple collisions', () => {
    const registry = new NameRegistry();
    expect(registry.makeUniqueName('x')).toBe('x');
    expect(registry.makeUniqueName('x')).toBe('x_1');
    expect(registry.makeUniqueName('x')).toBe('x_2');
  });
});

describe('NameRegistry isolation', () => {
  it('two instances do not share state', () => {
    const a = new NameRegistry();
    const b = new NameRegistry();
    expect(a.makeUniqueName('shared')).toBe('shared');
    expect(b.makeUniqueName('shared')).toBe('shared');
  });
});

describe('NameRegistry#getRegistry', () => {
  it('returns an empty map for a fresh registry', () => {
    const registry = new NameRegistry();
    expect(registry.getRegistry().size).toBe(0);
  });

  it('maps each assigned unique name to the original input', () => {
    const registry = new NameRegistry();
    registry.makeUniqueName('foo:bar');
    registry.makeUniqueName('foo/bar');
    const snapshot = registry.getRegistry();
    expect(snapshot.size).toBe(2);
    expect(snapshot.get('foo_bar')).toBe('foo:bar');
    expect(snapshot.get('foo_bar_1')).toBe('foo/bar');
  });

  it('reflects mutations made after retrieval (live view, not a copy)', () => {
    const registry = new NameRegistry();
    const snapshot = registry.getRegistry();
    expect(snapshot.size).toBe(0);
    registry.makeUniqueName('added-after');
    expect(snapshot.size).toBe(1);
    expect(snapshot.get('added-after')).toBe('added-after');
  });
});
