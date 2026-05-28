import { useEffect, useState } from 'preact/hooks';

type Mode = 'light' | 'dark' | 'system';

// Empty by design — the island's prop bag in IslandPropsMap is Record<string, never>.
export type ThemeToggleProps = Record<string, never>;

const STORAGE_KEY = 'theme';

function readInitialMode(): Mode {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function resolveSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyMode(mode: Mode) {
  if (typeof document === 'undefined') return;
  const effective = mode === 'system' ? resolveSystemMode() : mode;
  document.documentElement.dataset.theme = mode === 'system' ? '' : mode;
  document.documentElement.dataset.themeResolved = effective;
}

export function ThemeToggle(_props: ThemeToggleProps = {}) {
  // SSR renders an unknown state; the post-hydration effect reconciles.
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const initial = readInitialMode();
    setMode(initial);
    applyMode(initial);
  }, []);

  const select = (next: Mode) => {
    setMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    applyMode(next);
  };

  const isActive = (m: Mode) => mode === m;

  return (
    <div role="group" aria-label="Theme" class="inline-flex items-center gap-1 rounded border border-[var(--clean-border)] p-1">
      <button
        type="button"
        onClick={() => select('light')}
        aria-pressed={isActive('light')}
        class="rounded px-2 py-1 text-xs aria-pressed:bg-[var(--clean-accent)] aria-pressed:text-[var(--clean-accent-fg)]"
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => select('dark')}
        aria-pressed={isActive('dark')}
        class="rounded px-2 py-1 text-xs aria-pressed:bg-[var(--clean-accent)] aria-pressed:text-[var(--clean-accent-fg)]"
      >
        Dark
      </button>
      <button
        type="button"
        onClick={() => select('system')}
        aria-pressed={isActive('system')}
        class="rounded px-2 py-1 text-xs aria-pressed:bg-[var(--clean-accent)] aria-pressed:text-[var(--clean-accent-fg)]"
      >
        System
      </button>
    </div>
  );
}
