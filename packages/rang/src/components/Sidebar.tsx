import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { House, CodeXml, Globe, Mail, ExternalLink } from 'lucide-preact';
import type { NavNode } from '@clean-jsdoc-theme/utils';
import { cn } from '../lib/cn';

export interface SidebarProps {
  nav: NavNode[];
  currentSlug: string;
}

// Structural classes shared by every entry. Color/emphasis state is appended
// per-item below. Long symbol names wrap (break-words + hyphens) and any
// residual overflow is clipped, so a very long class/module name can never
// widen the sidebar column.
const ITEM_BASE =
  'group flex items-start gap-x-3 w-full px-3 py-1.5 text-left text-sm no-underline ' +
  'break-words hyphens-auto overflow-hidden rounded-xl outline-offset-[-1px] cursor-pointer';

// Selected page: tinted surface + primary text, bold weight. The `dark:` variant
// keys off [data-theme="dark"] (see the @custom-variant in tailwind.css).
const ITEM_ACTIVE =
  'bg-primary/10 text-primary font-bold ' + 'dark:bg-primary-light/10 dark:text-primary-light';

const ITEM_INACTIVE = 'text-[var(--clean-fg)] hover:bg-[var(--clean-bg-muted)]';

interface GroupedNav {
  /** Group label; empty string for ungrouped entries (no title rendered). */
  group: string;
  items: NavNode[];
}

/**
 * Bucket nodes into CONTIGUOUS runs of the same `group` label, preserving the
 * exact order setu emits. A new bucket starts whenever the group changes — so
 * interleaved ungrouped entries (e.g. external menu links sitting between
 * sections) keep their position instead of collapsing into one bucket.
 */
function groupNav(nav: readonly NavNode[]): GroupedNav[] {
  const groups: GroupedNav[] = [];
  let current: GroupedNav | null = null;
  for (const node of nav) {
    const label = node.group ?? '';
    if (!current || current.group !== label) {
      current = { group: label, items: [] };
      groups.push(current);
    }
    current.items.push(node);
  }
  return groups;
}

/**
 * The bundled lucide icon set. A `lucide:<name>` icon outside this set falls
 * back to `external-link`. Kept small on purpose — arbitrary glyphs come from
 * the Simple Icons CDN (`simpleicons:<slug>`) so we never bundle all of lucide.
 */
const LUCIDE_ICONS: Record<string, typeof House> = {
  home: House,
  'code-xml': CodeXml,
  globe: Globe,
  mail: Mail,
  'external-link': ExternalLink,
};

/**
 * Leading icon for a menu entry. The icon is a `source:code` string:
 *  - `simpleicons:<slug>` → the Simple Icons CDN glyph, painted with the `fg`
 *    theme token. The silhouette SVG is used as a CSS mask over a
 *    `var(--clean-fg)` fill, so it picks up the exact fg color and the
 *    light/dark swap for free (the variable is rebound under
 *    `[data-theme="dark"]`) — no per-theme image pair, no baked-in hex.
 *  - `lucide:<name>` → a bundled lucide icon; an unknown name → `external-link`.
 *  - anything else (no/unknown prefix) → the `external-link` lucide icon.
 * Returns `null` for entries with no icon (regular page/section links).
 */
function NavIcon({ icon }: { icon?: string }) {
  if (!icon) return null;
  const sep = icon.indexOf(':');
  const source = sep === -1 ? '' : icon.slice(0, sep);
  const code = sep === -1 ? icon : icon.slice(sep + 1);

  if (source === 'simpleicons' && code) {
    const url = `https://cdn.simpleicons.org/${encodeURIComponent(code)}`;
    const mask = `url(${url}) center / contain no-repeat`;
    return (
      <span
        aria-hidden="true"
        class="inline-block h-4 w-4 shrink-0 bg-(--clean-fg)"
        style={{ mask, WebkitMask: mask, opacity: 0.8 }}
      />
    );
  }

  // lucide (or any unrecognized prefix): bundled set, unknown → external-link.
  const Icon = LUCIDE_ICONS[code] ?? ExternalLink;
  return <Icon size={16} class="shrink-0" aria-hidden="true" />;
}

export interface SidebarItemProps {
  /** Leading icon node (e.g. a lucide icon element). */
  icon: ComponentChildren;
  label: string;
  onClick: () => void;
}

/**
 * A clickable sidebar row with a leading icon, styled like a nav entry. Used
 * for the action items (theme toggle, settings) at the top of the mobile nav
 * drawer — sharing `ITEM_BASE`/`ITEM_INACTIVE` so it matches the page links.
 */
export function SidebarItem({ icon, label, onClick }: SidebarItemProps) {
  return (
    <button type="button" onClick={onClick} class={cn(ITEM_BASE, ITEM_INACTIVE, 'items-center')}>
      <span class="flex shrink-0 items-center" aria-hidden="true">
        {icon}
      </span>
      <span class="min-w-0">{label}</span>
    </button>
  );
}

function NavLink({ node, currentSlug }: { node: NavNode; currentSlug: string }) {
  // min-w-0 lets the label shrink below its content width so break-words can act.
  const label = <span class="min-w-0 wrap-break-words">{node.label}</span>;
  const icon = <NavIcon icon={node.icon} />;
  // An icon row centers its content; a bare text link keeps the top alignment so
  // long wrapped labels read correctly.
  const align = node.icon ? 'items-center' : '';

  // External menu link (carries an absolute `href`): open in a new tab.
  if (node.external && node.href) {
    return (
      <a
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(ITEM_BASE, ITEM_INACTIVE, align)}
      >
        {icon}
        {label}
      </a>
    );
  }

  // `undefined` slug = a branch/group label (not navigable). An empty-string
  // slug is the site root (home), which IS navigable → `/`.
  if (node.slug === undefined) {
    return (
      <span class={cn(ITEM_BASE, 'text-muted-foreground', align)}>
        {icon}
        {label}
      </span>
    );
  }
  const isCurrent = node.slug === currentSlug;
  return (
    <a
      href={`/${node.slug}`}
      aria-current={isCurrent ? 'page' : undefined}
      class={cn(ITEM_BASE, align, isCurrent ? ITEM_ACTIVE : ITEM_INACTIVE)}
    >
      {icon}
      {label}
    </a>
  );
}

/**
 * A single sidebar row plus, when the node is a clubbed parent, its indented
 * child list. A parent (carries `children`) renders a non-navigable group label
 * and recurses; a leaf renders a {@link NavLink}. Owns its own `<li>` so the
 * section map can place it directly.
 */
function NavEntry({ node, currentSlug }: { node: NavNode; currentSlug: string }) {
  const children = node.children;
  if (children && children.length > 0) {
    return (
      <li class="my-0.5">
        <span class={cn(ITEM_BASE, 'items-center font-medium text-muted-foreground')}>
          <span class="min-w-0 wrap-break-words">{node.label}</span>
        </span>
        {/* Children indented with a guide rail, mirroring the section nesting. */}
        <ul class="m-0 mt-0.5 ml-4 list-none border-l border-(--clean-border) p-0 pl-2">
          {children.map((child, ci) => (
            <NavEntry
              key={child.slug ?? child.href ?? `${child.label}-${ci}`}
              node={child}
              currentSlug={currentSlug}
            />
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li class="my-0.5">
      <NavLink node={node} currentSlug={currentSlug} />
    </li>
  );
}

/** Find the nearest ancestor that actually scrolls vertically. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
    p = p.parentElement;
  }
  return null;
}

// Breathing room (px) left above the active item so the section label sitting
// just above it stays visible when we scroll it toward the top.
const ACTIVE_SCROLL_PADDING = 16;

export function Sidebar({ nav, currentSlug }: SidebarProps) {
  // Menu entries form a top region (icon links); the rest are grouped sections.
  const menuItems = nav.filter((n) => n.menu);
  const sectionNodes = nav.filter((n) => !n.menu);
  const groups = groupNav(sectionNodes);

  // Each page is a full reload, so the sidebar re-renders scrolled to the top —
  // a deep active item ends up below the fold and the reader has to hunt for it.
  // On hydration, bring the current page's entry up near the top of the sidebar's
  // own scroll container (never the window). Only the container is scrolled, and
  // only when the item isn't already at the desired position.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const container = scrollParent(active);
    if (!container) return;
    const delta = active.getBoundingClientRect().top - container.getBoundingClientRect().top;
    const target = delta - ACTIVE_SCROLL_PADDING;
    if (Math.abs(target) < 2) return;
    container.scrollTop += target;
  }, [currentSlug]);

  return (
    <nav ref={navRef} aria-label="Documentation navigation" class="text-(--clean-fg)">
      {menuItems.length > 0 && (
        <ul class="m-0 list-none p-0">
          {menuItems.map((node, ni) => (
            <li key={node.slug ?? node.href ?? `${node.label}-${ni}`} class="my-0.5">
              <NavLink node={node} currentSlug={currentSlug} />
            </li>
          ))}
        </ul>
      )}
      {menuItems.length > 0 && groups.length > 0 && <hr class="my-3 border-(--clean-border)" />}
      {groups.map((g, gi) => (
        <div key={g.group ? `g-${g.group}` : `_ungrouped-${gi}`} class="mt-4 first:mt-0">
          {g.group && (
            <div class="mb-1 py-1.5 px-3 text-sm font-bold text-(--clean-fg)">{g.group}</div>
          )}
          <ul class="m-0 list-none p-0">
            {g.items.map((node, ni) => (
              <NavEntry
                key={node.slug ?? node.href ?? `${node.label}-${ni}`}
                node={node}
                currentSlug={currentSlug}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
