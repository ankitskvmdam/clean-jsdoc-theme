import { useEffect, useState } from 'preact/hooks';
import { Sun, Moon } from 'lucide-preact';
import { Button } from './Button';

type Mode = 'light' | 'dark';

// Empty by design — the island's prop bag in IslandPropsMap is Record<string, never>.
export type ThemeToggleProps = Record<string, never>;

const STORAGE_KEY = 'theme';

function resolveSystemMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Stored preference wins; first-time visitors fall back to the system theme.
function readInitialMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return resolveSystemMode();
}

function applyMode(mode: Mode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = mode;
  // Now always equal to `data-theme` (no "system" pass-through). Kept for any
  // CSS still keyed on `data-theme-resolved`; safe to drop if nothing reads it.
  document.documentElement.dataset.themeResolved = mode;
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

  // Pre-hydration `mode` is null; default the icon to light until the effect runs.
  const current = mode ?? 'light';
  const next: Mode = current === 'light' ? 'dark' : 'light';

  const toggle = () => select(next);

  const Icon = current === 'light' ? Sun : Moon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title="Toggle theme"
    >
      <Icon size={18} aria-hidden="true" />
    </Button>
  );
}
