import { describe, it, expect } from 'vitest';
import type { ContainerView } from '../class-view';
import {
  hrefFor,
  makeLinkResolver,
  registerContainerView,
  type LinkRegistry,
} from '../link-registry';

/** Minimal empty buckets shared by the fixtures below. */
const emptyBuckets = {
  instanceMethods: [],
  staticMethods: [],
  instanceFields: [],
  staticFields: [],
  enums: [],
  events: [],
  other: [],
};

describe('hrefFor', () => {
  it('maps the empty slug to the home page', () => {
    expect(hrefFor('')).toBe('/');
  });

  it('prefixes a non-empty slug with a leading slash', () => {
    expect(hrefFor('base/chains')).toBe('/base/chains');
  });

  it('appends an anchor as a hash', () => {
    expect(hrefFor('base/chains', 'open')).toBe('/base/chains#open');
  });

  it('preserves an anchor even on the home page', () => {
    expect(hrefFor('', 'open')).toBe('/#open');
  });
});

describe('registerContainerView', () => {
  function makeView(): ContainerView {
    return {
      ...emptyBuckets,
      kind: 'module',
      augments: [],
      constructorParams: [],
      doclet: { longname: 'base/chains' },
      instanceMethods: [
        { longname: 'base/chains#open', name: 'open' },
        { longname: 'base/chains#end', name: 'end' },
      ],
      staticFields: [{ longname: 'base/chains.VERSION', name: 'VERSION' }],
    } as unknown as ContainerView;
  }

  it('registers the page-level longname against the bare slug', () => {
    const registry: LinkRegistry = new Map();
    registerContainerView(registry, makeView(), 'pages/base-chains');
    expect(registry.get('base/chains')).toEqual({ slug: 'pages/base-chains' });
  });

  it('registers members with slug + slugified-name anchor across buckets', () => {
    const registry: LinkRegistry = new Map();
    registerContainerView(registry, makeView(), 'pages/base-chains');
    expect(registry.get('base/chains#open')).toEqual({
      slug: 'pages/base-chains',
      anchor: 'open',
    });
    expect(registry.get('base/chains#end')).toEqual({
      slug: 'pages/base-chains',
      anchor: 'end',
    });
    expect(registry.get('base/chains.VERSION')).toEqual({
      slug: 'pages/base-chains',
      anchor: 'version',
    });
  });

  it('first registration wins on a duplicate longname', () => {
    const registry: LinkRegistry = new Map();
    registerContainerView(registry, makeView(), 'first');
    registerContainerView(registry, makeView(), 'second');
    expect(registry.get('base/chains')).toEqual({ slug: 'first' });
    expect(registry.get('base/chains#open')).toEqual({
      slug: 'first',
      anchor: 'open',
    });
  });

  it('skips members lacking a longname or name', () => {
    const registry: LinkRegistry = new Map();
    const view = {
      ...emptyBuckets,
      kind: 'module',
      augments: [],
      constructorParams: [],
      doclet: { longname: 'mod' },
      other: [{ name: 'noLongname' }, { longname: 'mod.noName' }],
    } as unknown as ContainerView;
    registerContainerView(registry, view, 'mod');
    expect(registry.has('mod.noName')).toBe(false);
    expect(registry.size).toBe(1); // only the page-level symbol
  });
});

describe('makeLinkResolver', () => {
  const registry: LinkRegistry = new Map([
    ['base/chains', { slug: 'pages/base-chains' }],
    ['base/chains#open', { slug: 'pages/base-chains', anchor: 'open' }],
    ['Home', { slug: '' }],
    ['module:queue/types', { slug: 'pages/queue-types' }],
    ['BareModule', { slug: 'pages/bare-module' }],
  ]);
  const resolve = makeLinkResolver(registry);

  it('returns null for an empty / whitespace target', () => {
    expect(resolve('')).toBeNull();
    expect(resolve('   ')).toBeNull();
  });

  it('flags http(s) URLs as external', () => {
    expect(resolve('https://example.com/x')).toEqual({
      href: 'https://example.com/x',
      external: true,
    });
  });

  it('flags mailto: as external', () => {
    expect(resolve('mailto:a@b.com')).toEqual({
      href: 'mailto:a@b.com',
      external: true,
    });
  });

  it('resolves a known namepath to an absolute slug', () => {
    expect(resolve('base/chains')).toEqual({
      href: '/pages/base-chains',
      external: false,
    });
  });

  it('resolves a member namepath to slug#anchor', () => {
    expect(resolve('base/chains#open')).toEqual({
      href: '/pages/base-chains#open',
      external: false,
    });
  });

  it('resolves a root-slug entry to /', () => {
    expect(resolve('Home')).toEqual({ href: '/', external: false });
  });

  it('returns null for an unknown namepath', () => {
    expect(resolve('Nope.Missing')).toBeNull();
  });

  it('strips a wrapping brace pair before lookup', () => {
    expect(resolve('{base/chains#open}')).toEqual({
      href: '/pages/base-chains#open',
      external: false,
    });
  });

  it('falls back from a bare key to the module: prefixed entry', () => {
    expect(resolve('queue/types')).toEqual({
      href: '/pages/queue-types',
      external: false,
    });
  });

  it('falls back from a module: key to the bare entry', () => {
    expect(resolve('module:BareModule')).toEqual({
      href: '/pages/bare-module',
      external: false,
    });
  });
});

describe('makeLinkResolver — unique short-name fallback', () => {
  it('resolves a bare name to its module-qualified entry', () => {
    const registry: LinkRegistry = new Map([
      ['module:CoreSchema~BaseEntity', { slug: 'pages/base-entity' }],
    ]);
    const resolve = makeLinkResolver(registry);
    expect(resolve('BaseEntity')).toEqual({
      href: '/pages/base-entity',
      external: false,
    });
  });

  it('resolves a bare member name to its slug#anchor', () => {
    const registry: LinkRegistry = new Map([
      ['base/chains#open', { slug: 'pages/base-chains', anchor: 'open' }],
    ]);
    const resolve = makeLinkResolver(registry);
    expect(resolve('open')).toEqual({
      href: '/pages/base-chains#open',
      external: false,
    });
  });

  it('refuses an ambiguous short name (two pages, same member name)', () => {
    const registry: LinkRegistry = new Map([
      ['base/chains#open', { slug: 'pages/base-chains', anchor: 'open' }],
      ['queue/stream#open', { slug: 'pages/queue-stream', anchor: 'open' }],
    ]);
    const resolve = makeLinkResolver(registry);
    expect(resolve('open')).toBeNull();
  });

  it('treats the same target seen twice as non-ambiguous', () => {
    const registry: LinkRegistry = new Map([
      ['module:CoreSchema~BaseEntity', { slug: 'pages/base-entity' }],
      ['CoreSchema~BaseEntity', { slug: 'pages/base-entity' }],
    ]);
    const resolve = makeLinkResolver(registry);
    expect(resolve('BaseEntity')).toEqual({
      href: '/pages/base-entity',
      external: false,
    });
  });

  it('lets an exact longname win over a colliding short name', () => {
    // `Queue` is both an exact longname (its own page) and the short name of a
    // different, module-qualified symbol. The exact lookup must win.
    const registry: LinkRegistry = new Map([
      ['Queue', { slug: 'pages/queue-class' }],
      ['module:other~Queue', { slug: 'pages/other-queue' }],
    ]);
    const resolve = makeLinkResolver(registry);
    expect(resolve('Queue')).toEqual({
      href: '/pages/queue-class',
      external: false,
    });
  });

  it('does not split on `/` (module paths stay whole)', () => {
    const registry: LinkRegistry = new Map([['module:queue/types', { slug: 'pages/queue-types' }]]);
    const resolve = makeLinkResolver(registry);
    // Prefix-stripped short name is `queue/types`, not `types`.
    expect(resolve('queue/types')).toEqual({
      href: '/pages/queue-types',
      external: false,
    });
  });
});
