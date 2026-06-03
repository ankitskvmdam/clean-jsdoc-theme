import { useEffect, useState } from 'preact/hooks';
import { Sun, Moon, Monitor } from 'lucide-preact';

type Mode = 'light' | 'dark' | 'system';

const MODE_ORDER: Mode[] = ['light', 'dark', 'system'];

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

  // Pre-hydration `mode` is null; treat it as system so the icon is stable.
  const current = mode ?? 'system';
  const cycle = () => {
    const next = MODE_ORDER[(MODE_ORDER.indexOf(current) + 1) % MODE_ORDER.length];
    select(next);
  };

  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${current}`}
      title="Toggle theme"
      class="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--clean-fg-muted)] hover:bg-[var(--clean-bg-muted)] hover:text-[var(--clean-fg)]"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
