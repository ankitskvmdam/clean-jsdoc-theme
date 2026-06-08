import type { ComponentChildren } from 'preact';
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

export function Sidebar({ nav, currentSlug }: SidebarProps) {
  // Menu entries form a top region (icon links); the rest are grouped sections.
  const menuItems = nav.filter((n) => n.menu);
  const sectionNodes = nav.filter((n) => !n.menu);
  const groups = groupNav(sectionNodes);
  return (
    <nav aria-label="Documentation navigation" class="text-(--clean-fg)">
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
              <li key={node.slug ?? node.href ?? `${node.label}-${ni}`} class="my-0.5">
                <NavLink node={node} currentSlug={currentSlug} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
