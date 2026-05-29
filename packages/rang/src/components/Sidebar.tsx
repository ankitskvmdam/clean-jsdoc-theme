import { useState } from 'preact/hooks';
import type { NavNode } from '@clean-jsdoc-theme/utils';

export interface SidebarProps {
  nav: NavNode[];
  currentSlug: string;
}

function nodeContainsSlug(node: NavNode, slug: string): boolean {
  if (node.slug === slug) return true;
  if (!node.children) return false;
  return node.children.some((c) => nodeContainsSlug(c, slug));
}

interface NavItemProps {
  node: NavNode;
  currentSlug: string;
  depth: number;
}

function NavItem({ node, currentSlug, depth }: NavItemProps) {
  const hasChildren = !!node.children && node.children.length > 0;
  const containsCurrent = nodeContainsSlug(node, currentSlug);
  // Branches start expanded only when they contain the current slug; collapsed otherwise.
  const [expanded, setExpanded] = useState(containsCurrent);
  const isCurrent = node.slug === currentSlug;

  if (hasChildren) {
    return (
      <li class="my-0.5">
        <div class="flex items-center gap-1">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            class="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--clean-fg-muted)] hover:bg-[var(--clean-bg-muted)]"
            aria-label={expanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            <svg
              aria-hidden="true"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}
            >
              <path
                d="M3 1l4 4-4 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          {node.slug ? (
            <a
              href={`/${node.slug}`}
              aria-current={isCurrent ? 'page' : undefined}
              class={`flex-1 rounded px-2 py-1 text-sm hover:bg-[var(--clean-bg-muted)] ${
                isCurrent
                  ? 'bg-[var(--clean-bg-muted)] font-semibold text-[var(--clean-accent)]'
                  : 'text-[var(--clean-fg)]'
              }`}
            >
              {node.label}
            </a>
          ) : (
            <span class="flex-1 px-2 py-1 text-sm font-semibold text-[var(--clean-fg)]">
              {node.label}
            </span>
          )}
        </div>
        {expanded && (
          <ul class="ml-4 border-l border-[var(--clean-border)] pl-2" role="group">
            {node.children!.map((child) => (
              <NavItem
                key={(child.slug ?? child.label) + depth}
                node={child}
                currentSlug={currentSlug}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li class="my-0.5">
      {node.slug ? (
        <a
          href={`/${node.slug}`}
          aria-current={isCurrent ? 'page' : undefined}
          class={`block rounded px-2 py-1 text-sm hover:bg-[var(--clean-bg-muted)] ${
            isCurrent
              ? 'bg-[var(--clean-bg-muted)] font-semibold text-[var(--clean-accent)]'
              : 'text-[var(--clean-fg)]'
          }`}
        >
          {node.label}
        </a>
      ) : (
        <span class="block px-2 py-1 text-sm text-[var(--clean-fg-muted)]">{node.label}</span>
      )}
    </li>
  );
}

export function Sidebar({ nav, currentSlug }: SidebarProps) {
  return (
    <nav aria-label="Documentation navigation" class="text-[var(--clean-fg)]">
      <ul class="m-0 list-none p-0">
        {nav.map((node) => (
          <NavItem key={node.slug ?? node.label} node={node} currentSlug={currentSlug} depth={0} />
        ))}
      </ul>
    </nav>
  );
}
