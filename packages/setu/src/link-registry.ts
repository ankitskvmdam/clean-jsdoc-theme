/**
 * Link registry + resolver for `{@link}` / `@see` cross-references.
 *
 * The registry maps a JSDoc longname to the page slug (and optional heading
 * anchor) that setu actually generated for it. Keys are real generated
 * longnames — we never reverse-engineer JSDoc namepath semantics, we just look
 * up what we emitted. That keeps resolution honest: a target only resolves if a
 * page or member heading exists for it.
 *
 * Build order matters: pages link to each other, so the registry must be fully
 * populated before any page body renders (a two-pass build in `generateSite`).
 */
import { slugifyHeading } from '@clean-jsdoc-theme/utils';
import type { ContainerView } from './class-view';

/** A resolved location: the page slug and an optional in-page heading anchor. */
export interface RegistryEntry {
  slug: string;
  anchor?: string;
}

/** longname → location. First registration wins (see {@link registerContainerView}). */
export type LinkRegistry = Map<string, RegistryEntry>;

/** The result of resolving a link target. `external` flags off-site URLs. */
export interface ResolvedLink {
  href: string;
  external: boolean;
}

/**
 * Build the `href` for a registry entry. Absolute, leading-slash paths to match
 * how `Sidebar.tsx` renders links (`href={`/${node.slug}`}`).
 *
 * The empty slug is the home page, so it maps to `/` (not `/`-plus-nothing via
 * the template, which would still be `/` but we special-case for clarity). An
 * anchor on the home page is preserved in case one ever shows up.
 */
export function hrefFor(slug: string, anchor?: string): string {
  if (slug === '') return '/' + (anchor ? `#${anchor}` : '');
  return `/${slug}` + (anchor ? `#${anchor}` : '');
}

/**
 * Register everything reachable from a single container page into `registry`.
 *
 * - The page-level symbol (`view.doclet.longname`) maps to the bare slug.
 * - Every member across all buckets maps `member.longname → { slug, anchor }`
 *   where the anchor is `slugifyHeading(member.name)`.
 *
 * First registration wins (`registry.has` guard): if the same longname surfaces
 * on more than one page — e.g. an inherited member rendered on both the base and
 * the subclass — the earlier page keeps the link. Stable and good enough for v1.
 *
 * Known limitation: anchors are bare `slugifyHeading(member.name)` with no
 * per-page dedup counter, so a member whose heading slug collides with another
 * heading on the same page may get a slightly-off anchor. Documented; not fixed
 * here.
 */
export function registerContainerView(
  registry: LinkRegistry,
  view: ContainerView,
  slug: string
): void {
  const pageKey = view.doclet.longname;
  if (pageKey && !registry.has(pageKey)) {
    registry.set(pageKey, { slug });
  }

  // Explicit list of bucket arrays so the walk is robust to bucket additions.
  const buckets = [
    view.instanceMethods,
    view.staticMethods,
    view.instanceFields,
    view.staticFields,
    view.enums,
    view.events,
    view.other,
  ];

  for (const bucket of buckets) {
    for (const member of bucket) {
      const key = member.longname;
      if (key && member.name && !registry.has(key)) {
        registry.set(key, { slug, anchor: slugifyHeading(member.name) });
      }
    }
  }
}

/** `module:` prefix, lifted so the slice length stays in sync with the literal. */
const MODULE_PREFIX = 'module:';

/**
 * Leading namespace prefixes JSDoc puts on longnames. We strip these before
 * deriving a short name so `module:CoreSchema~BaseEntity` indexes under
 * `BaseEntity`, and we also index the prefix-stripped longname itself
 * (`CoreSchema~BaseEntity`) so a prefixless author target still hits.
 */
const NAMESPACE_PREFIXES = ['module:', 'event:', 'external:'];

/** Strip a single leading JSDoc namespace prefix (`module:`, …) if present. */
function stripNamespacePrefix(longname: string): string {
  for (const prefix of NAMESPACE_PREFIXES) {
    if (longname.startsWith(prefix)) return longname.slice(prefix.length);
  }
  return longname;
}

/**
 * The symbol's short name: the trailing segment after the last JSDoc namepath
 * separator (`~`, `#`, `.`). `/` is NOT a separator — it's part of a module
 * path — so `module:queue/types` → `queue/types` (after prefix strip), while
 * `module:CoreSchema~BaseEntity` → `BaseEntity` and `base/chains#open` → `open`.
 */
function shortName(longname: string): string {
  const stripped = stripNamespacePrefix(longname);
  let last = -1;
  for (let i = 0; i < stripped.length; i++) {
    const c = stripped[i];
    if (c === '~' || c === '#' || c === '.') last = i;
  }
  return last === -1 ? stripped : stripped.slice(last + 1);
}

/** Two entries collide only if they point at a different page/anchor. */
function sameTarget(a: RegistryEntry, b: RegistryEntry): boolean {
  return a.slug === b.slug && a.anchor === b.anchor;
}

/**
 * Build the secondary short-name index off the primary registry.
 *
 * For each `[longname, entry]` we record the entry under its short name and
 * under its prefix-stripped longname. A key that maps to two *different*
 * targets is marked ambiguous (`null`) so the resolver refuses to guess; the
 * same target seen twice is not a conflict. Empty keys are skipped.
 */
function buildNameIndex(
  registry: LinkRegistry
): Map<string, RegistryEntry | null> {
  const index = new Map<string, RegistryEntry | null>();

  const add = (key: string, entry: RegistryEntry): void => {
    if (key === '') return;
    if (!index.has(key)) {
      index.set(key, entry);
      return;
    }
    const existing = index.get(key);
    if (existing === null) return; // already ambiguous
    if (existing && !sameTarget(existing, entry)) index.set(key, null);
  };

  for (const [longname, entry] of registry) {
    add(shortName(longname), entry);
    add(stripNamespacePrefix(longname), entry);
  }

  return index;
}

/**
 * Build a `resolveLink(target)` closed over `registry`.
 *
 * Resolution steps:
 * 1. Trim; empty → `null`.
 * 2. Strip a single wrapping `{ … }` (the `@see {namepath}` form).
 * 3. URL detection (`//`, `http(s)://`, `mailto:`) → external, href verbatim.
 * 4. Registry lookup with a `module:`-prefix fallback both ways, because JSDoc
 *    is inconsistent about emitting the prefix in link targets vs. longnames.
 * 5. Unique short-name fallback: a bare authored name (`BaseEntity`) resolves to
 *    its symbol *only when that name is unambiguous* across the whole registry.
 *    Ambiguous names refuse to resolve rather than guess.
 * 6. Miss → `null` so the caller can fall back to inert inline code.
 *
 * The short-name index is derived once when the resolver is built; it never
 * changes any resolution the exact/`module:` lookups already made — it only adds
 * resolutions for keys that would otherwise have been `null`.
 */
export function makeLinkResolver(
  registry: LinkRegistry
): (target: string) => ResolvedLink | null {
  const nameIndex = buildNameIndex(registry);

  return function resolveLink(target: string): ResolvedLink | null {
    const t = target.trim();
    if (t === '') return null;

    // `@see {namepath}` — strip exactly one wrapping brace pair.
    const key =
      t.startsWith('{') && t.endsWith('}') ? t.slice(1, -1).trim() : t;

    // Off-site URLs (protocol-relative, http(s), mailto) pass straight through.
    if (/^(https?:)?\/\//i.test(key) || /^mailto:/i.test(key)) {
      return { href: key, external: true };
    }

    let entry = registry.get(key);
    if (!entry) {
      // JSDoc may or may not carry the `module:` prefix — try the other form.
      if (!key.startsWith(MODULE_PREFIX)) {
        entry = registry.get(MODULE_PREFIX + key);
      } else {
        entry = registry.get(key.slice(MODULE_PREFIX.length));
      }
    }

    // Unique short-name fallback. Try the key as-authored, then prefix-stripped.
    // `undefined` = not indexed; `null` = ambiguous (refuse). Only a concrete
    // entry resolves.
    if (!entry) {
      const byName = nameIndex.get(key);
      if (byName) {
        entry = byName;
      } else if (byName === undefined) {
        const stripped = stripNamespacePrefix(key);
        if (stripped !== key) {
          const byStripped = nameIndex.get(stripped);
          if (byStripped) entry = byStripped;
        }
      }
    }

    if (entry) {
      return { href: hrefFor(entry.slug, entry.anchor), external: false };
    }

    return null;
  };
}
