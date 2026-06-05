import type { NavNode } from '@clean-jsdoc-theme/utils';

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

/** Bucket nodes by their `group` label, preserving the order setu emits. */
function groupNav(nav: readonly NavNode[]): GroupedNav[] {
  const groups: GroupedNav[] = [];
  const byLabel = new Map<string, GroupedNav>();
  for (const node of nav) {
    const label = node.group ?? '';
    let bucket = byLabel.get(label);
    if (!bucket) {
      bucket = { group: label, items: [] };
      byLabel.set(label, bucket);
      groups.push(bucket);
    }
    bucket.items.push(node);
  }
  return groups;
}

function NavLink({ node, currentSlug }: { node: NavNode; currentSlug: string }) {
  const isCurrent = node.slug === currentSlug;
  // min-w-0 lets the label shrink below its content width so break-words can act.
  const label = <span class="min-w-0 wrap-break-words">{node.label}</span>;

  if (!node.slug) {
    return <span class={`${ITEM_BASE} text-muted-foreground`}>{label}</span>;
  }
  return (
    <a
      href={`/${node.slug}`}
      aria-current={isCurrent ? 'page' : undefined}
      class={`${ITEM_BASE} ${isCurrent ? ITEM_ACTIVE : ITEM_INACTIVE}`}
    >
      {label}
    </a>
  );
}

export function Sidebar({ nav, currentSlug }: SidebarProps) {
  const groups = groupNav(nav);
  return (
    <nav aria-label="Documentation navigation" class="text-(--clean-fg)">
      {groups.map((g) => (
        <div key={g.group || '_ungrouped'} class="mt-4 first:mt-0">
          {g.group && (
            <div class="mb-1 py-1.5 px-3 text-sm font-bold text-(--clean-fg)">{g.group}</div>
          )}
          <ul class="m-0 list-none p-0">
            {g.items.map((node) => (
              <li key={node.slug ?? node.label} class="my-0.5">
                <NavLink node={node} currentSlug={currentSlug} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
