import { useEffect, useState } from 'preact/hooks';
import type { Heading } from '@clean-jsdoc-theme/utils';

export interface TOCProps {
  headings: Heading[];
}

interface TocTree {
  heading: Heading;
  children: TocTree[];
}

function buildTree(headings: Heading[]): TocTree[] {
  const roots: TocTree[] = [];
  const stack: TocTree[] = [];
  for (const h of headings) {
    const node: TocTree = { heading: h, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].heading.depth >= h.depth) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }
  return roots;
}

function TocList({ tree, activeId }: { tree: TocTree[]; activeId: string | null }) {
  if (tree.length === 0) return null;
  return (
    <ul class="m-0 list-none p-0">
      {tree.map((node) => {
        const isActive = node.heading.id === activeId;
        return (
          <li key={node.heading.id} class="my-0.5">
            <a
              href={`#${node.heading.id}`}
              aria-current={isActive ? 'location' : undefined}
              class={`block rounded px-2 py-1 text-sm hover:text-[var(--clean-accent)] ${
                isActive ? 'font-semibold text-[var(--clean-accent)]' : 'text-[var(--clean-fg-muted)]'
              }`}
            >
              {node.heading.text}
            </a>
            {node.children.length > 0 && (
              <div class="ml-3 border-l border-[var(--clean-border)] pl-2">
                <TocList tree={node.children} activeId={activeId} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TOC({ headings }: TOCProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const tree = buildTree(headings);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const ids = headings.map((h) => h.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // 0.0 / 1.0 threshold + rootMargin biased to the upper third of the viewport so the
    // "currently active" heading is the one whose section the reader is in.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '0px 0px -66% 0px', threshold: [0, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="On this page" class="text-[var(--clean-fg)]">
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--clean-fg-muted)]">On this page</h2>
      <TocList tree={tree} activeId={activeId} />
    </nav>
  );
}
