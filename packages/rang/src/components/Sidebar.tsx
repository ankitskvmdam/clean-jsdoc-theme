import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { House, CodeXml, Globe, Mail, ExternalLink, ChevronRight } from 'lucide-preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import type { NavNode } from '@clean-jsdoc-theme/utils';
import { withBase } from '@clean-jsdoc-theme/utils';
import { cn } from '../lib/cn';
import { SimpleIcon } from './SimpleIcon';

export interface SidebarProps {
  nav: NavNode[];
  currentSlug: string;
  /**
   * Base-path prefix for internal nav links (default `'/'`). This island
   * hydrates from JSON props, so the prefix must travel as a prop — not via a
   * Preact context (which wouldn't survive to the client).
   */
  basePath?: string;
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
    return <SimpleIcon slug={code} />;
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

function NavLink({
  node,
  currentSlug,
  basePath,
}: {
  node: NavNode;
  currentSlug: string;
  basePath: string;
}) {
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
      href={withBase(basePath, '/' + node.slug)}
      aria-current={isCurrent ? 'page' : undefined}
      class={cn(ITEM_BASE, align, isCurrent ? ITEM_ACTIVE : ITEM_INACTIVE)}
    >
      {icon}
      {label}
    </a>
  );
}

// Persisted per-club open/closed state, keyed by section + label. A `localStorage`
// map of explicit user choices: an entry present means the user toggled it, so it
// wins over the default; an absent entry falls back to the default (collapsed,
// unless the club holds the current page).
const OPEN_STATE_KEY = 'clean-jsdoc-theme:sidebar-open';

function readOpenState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(OPEN_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeOpenState(map: Record<string, boolean>): void {
  try {
    localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(map));
  } catch {
    // Private mode / disabled storage — collapse state just isn't persisted.
  }
}

/** Stable key for a club parent (section + label), used as its open-state id. */
function clubKey(node: NavNode): string {
  return `${node.group ?? ''}::${node.label}`;
}

interface NavEntryProps {
  node: NavNode;
  currentSlug: string;
  basePath: string;
  /** Explicit per-club open/closed choices (absent → use the default). */
  openMap: Record<string, boolean>;
  /** Persist a club's new open state. */
  onToggle: (key: string, open: boolean) => void;
}

/**
 * A single sidebar row plus, when the node is a clubbed parent, its collapsible
 * child list. A parent (carries `children`) renders a toggle button with a
 * chevron and reveals its children only when open; a leaf renders a
 * {@link NavLink}. Clubs are collapsed by default, EXCEPT the one holding the
 * current page (so you can always see where you are); an explicit user toggle
 * (persisted in `openMap`) overrides that default. Owns its own `<li>`.
 */
function NavEntry({ node, currentSlug, basePath, openMap, onToggle }: NavEntryProps) {
  const children = node.children;
  if (children && children.length > 0) {
    const key = clubKey(node);
    const holdsActive = children.some((c) => c.slug !== undefined && c.slug === currentSlug);
    const open = openMap[key] ?? holdsActive;
    return (
      <li class="my-0.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => onToggle(key, !open)}
          class={cn(ITEM_BASE, ITEM_INACTIVE, 'items-center font-medium')}
        >
          <span class="min-w-0 wrap-break-words">{node.label}</span>
          <ChevronRight
            size={16}
            aria-hidden="true"
            class={cn('ml-auto shrink-0 transition-transform', open && 'rotate-90')}
          />
        </button>
        {/* Children indented with a guide rail; only mounted while open. */}
        {open && (
          <ul class="m-0 mt-0.5 ml-4 list-none border-l border-(--clean-border) p-0 pl-2">
            {children.map((child, ci) => (
              <NavEntry
                key={child.slug ?? child.href ?? `${child.label}-${ci}`}
                node={child}
                currentSlug={currentSlug}
                basePath={basePath}
                openMap={openMap}
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }
  return (
    <li class="my-0.5">
      <NavLink node={node} currentSlug={currentSlug} basePath={basePath} />
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

export function Sidebar({ nav, currentSlug, basePath = '/' }: SidebarProps) {
  const { t } = useTranslation();
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

  // Persisted club open/closed state. Starts empty so the SSR markup and the
  // first client render agree (no hydration mismatch); the stored preferences
  // load right after mount. Toggling updates state and persists immediately.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setOpenMap(readOpenState());
  }, []);
  const handleToggle = (key: string, open: boolean): void => {
    setOpenMap((prev) => {
      const next = { ...prev, [key]: open };
      writeOpenState(next);
      return next;
    });
  };

  return (
    <nav ref={navRef} aria-label={t('chrome.nav.docNavLabel')} class="text-(--clean-fg)">
      {menuItems.length > 0 && (
        <ul class="m-0 list-none p-0">
          {menuItems.map((node, ni) => (
            <li key={node.slug ?? node.href ?? `${node.label}-${ni}`} class="my-0.5">
              <NavLink node={node} currentSlug={currentSlug} basePath={basePath} />
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
                basePath={basePath}
                openMap={openMap}
                onToggle={handleToggle}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
