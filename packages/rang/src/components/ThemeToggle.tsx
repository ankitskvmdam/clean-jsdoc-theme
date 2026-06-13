import { useEffect, useState } from 'preact/hooks';
import { Sun, Moon } from 'lucide-preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import { Button } from './Button';

type Mode = 'light' | 'dark';

// Empty by design — the island's prop bag in IslandPropsMap is Record<string, never>.
export type ThemeToggleProps = Record<string, never>;

const STORAGE_KEY = 'theme';
const DEFAULT_MODE: Mode = 'light';

// Stored preference wins; first-time visitors default to light. There is no
// "system" mode — the theme is always an explicit light/dark choice.
function readInitialMode(): Mode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return DEFAULT_MODE;
}

function applyMode(mode: Mode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = mode;
}

/**
 * Theme mode state + toggle, factored out so multiple controls can drive the
 * same light/dark preference without duplicating the storage/apply logic — the
 * header's icon `ThemeToggle` and the mobile drawer's "Toggle theme" row both
 * use it. `current` is the resolved mode (defaults to light pre-hydration);
 * `next` is what `toggle()` switches to.
 */
export function useThemeMode() {
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

  // Pre-hydration `mode` is null; default to light until the effect runs.
  const current = mode ?? 'light';
  const next: Mode = current === 'light' ? 'dark' : 'light';

  return { current, next, toggle: () => select(next) };
}

export function ThemeToggle(_props: ThemeToggleProps = {}) {
  const { t } = useTranslation();
  const { current, next, toggle } = useThemeMode();

  const Icon = current === 'light' ? Sun : Moon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={t('chrome.theme.switchTo', { mode: next })}
      title={t('chrome.theme.toggleTitle')}
    >
      <Icon size={18} aria-hidden="true" />
    </Button>
  );
}
