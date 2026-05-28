import { useRef, useState } from 'preact/hooks';

export interface CodeTab {
  label: string;
  lang: string;
  code: string;
}

export interface CodeTabsProps {
  tabs: CodeTab[];
}

export function CodeTabs({ tabs }: CodeTabsProps) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (tabs.length === 0) return null;

  const focusTab = (idx: number) => {
    const clamped = (idx + tabs.length) % tabs.length;
    setActive(clamped);
    const el = tabRefs.current[clamped];
    if (el) el.focus();
  };

  const onKeyDown = (e: KeyboardEvent, idx: number) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        focusTab(idx + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusTab(idx - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusTab(0);
        break;
      case 'End':
        e.preventDefault();
        focusTab(tabs.length - 1);
        break;
    }
  };

  return (
    <div class="my-4 rounded border border-[var(--clean-border)]">
      <div role="tablist" aria-label="Code variants" class="flex gap-1 border-b border-[var(--clean-border)] bg-[var(--clean-bg-muted)] px-2 pt-2">
        {tabs.map((tab, i) => {
          const id = `code-tab-${i}`;
          const panelId = `code-tab-panel-${i}`;
          const isActive = i === active;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              class={`rounded-t border border-b-0 px-3 py-1 text-sm ${
                isActive
                  ? 'border-[var(--clean-border)] bg-[var(--clean-bg)] text-[var(--clean-fg)]'
                  : 'border-transparent text-[var(--clean-fg-muted)] hover:text-[var(--clean-fg)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, i) => {
        const id = `code-tab-${i}`;
        const panelId = `code-tab-panel-${i}`;
        const isActive = i === active;
        return (
          <div
            key={panelId}
            id={panelId}
            role="tabpanel"
            aria-labelledby={id}
            hidden={!isActive}
            class="bg-[var(--clean-bg)] p-3"
          >
            <pre class="m-0 overflow-x-auto text-sm"><code class={`language-${tab.lang}`}>{tab.code}</code></pre>
          </div>
        );
      })}
    </div>
  );
}
