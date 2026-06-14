import { useEffect, useState } from 'preact/hooks';
import { Settings as SettingsIcon } from 'lucide-preact';
import { useTranslation, type ChromeKey } from '@clean-jsdoc-theme/bhasha';
import { Button } from './Button';
import { Dialog, DialogHeader, DialogTitle, DialogBody } from './Dialog';
import { cn } from '../lib/cn';

// Empty by design — the island takes no server props; all state is read from
// localStorage on the client. Kept as a typed alias so the shape can grow.
export type SettingsProps = Record<string, never>;

type FontSize = 'sm' | 'md' | 'lg';
type LineSpacing = 'compact' | 'default' | 'relaxed';

// Storage keys + applied values are mirrored by dwar's pre-hydration script
// (packages/dwar/src/theme-script.ts) so preferences apply before first paint.
const FONT_SIZE_KEY = 'clean-font-size';
const LINE_SPACING_KEY = 'clean-line-spacing';

// Labels are catalog keys, resolved to strings via `t` inside the component
// (a hook can't run at module scope). The values stay locale-invariant.
const FONT_SIZE_OPTIONS: ReadonlyArray<{ value: FontSize; labelKey: ChromeKey }> = [
  { value: 'sm', labelKey: 'chrome.settings.sizeSmall' },
  { value: 'md', labelKey: 'chrome.settings.sizeDefault' },
  { value: 'lg', labelKey: 'chrome.settings.sizeLarge' },
];

const LINE_SPACING_OPTIONS: ReadonlyArray<{ value: LineSpacing; labelKey: ChromeKey }> = [
  { value: 'compact', labelKey: 'chrome.settings.spacingCompact' },
  { value: 'default', labelKey: 'chrome.settings.spacingDefault' },
  { value: 'relaxed', labelKey: 'chrome.settings.spacingRelaxed' },
];

// 'md' / 'default' map to "no override" so the CSS defaults apply.
const FONT_SIZE_PX: Partial<Record<FontSize, string>> = { sm: '15px', lg: '18px' };
const LINE_HEIGHT: Partial<Record<LineSpacing, string>> = { compact: '1.4', relaxed: '1.8' };

function readStored<T extends string>(key: string, allowed: ReadonlyArray<T>, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const v = window.localStorage.getItem(key);
  return v && (allowed as ReadonlyArray<string>).includes(v) ? (v as T) : fallback;
}

function applyFontSize(size: FontSize) {
  if (typeof document === 'undefined') return;
  const px = FONT_SIZE_PX[size];
  if (px) document.documentElement.style.fontSize = px;
  else document.documentElement.style.removeProperty('font-size');
}

function applyLineSpacing(spacing: LineSpacing) {
  if (typeof document === 'undefined') return;
  const lh = LINE_HEIGHT[spacing];
  if (lh) document.documentElement.style.setProperty('--clean-line-height', lh);
  else document.documentElement.style.removeProperty('--clean-line-height');
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      class="inline-flex items-center gap-1 rounded-md border border-border p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          class={cn(
            'rounded px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent',
            'aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The settings dialog itself (reading-preference controls), controlled by the
 * caller. Split out from the trigger so it can be opened from anywhere — the
 * header's icon `Settings` button and the mobile drawer's "Settings" row both
 * drive this same dialog without duplicating the font-size / line-spacing logic.
 */
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useTranslation();
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>('default');

  // Resolve the locale-invariant option keys to display strings.
  const fontSizeOptions = FONT_SIZE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }));
  const lineSpacingOptions = LINE_SPACING_OPTIONS.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));

  // Reconcile state from storage on mount (dwar's pre-hydration script already
  // applied the visual values; this syncs the controls to match).
  useEffect(() => {
    setFontSize(readStored<FontSize>(FONT_SIZE_KEY, ['sm', 'md', 'lg'], 'md'));
    setLineSpacing(
      readStored<LineSpacing>(LINE_SPACING_KEY, ['compact', 'default', 'relaxed'], 'default')
    );
  }, []);

  const selectFontSize = (next: FontSize) => {
    setFontSize(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(FONT_SIZE_KEY, next);
    applyFontSize(next);
  };

  const selectLineSpacing = (next: LineSpacing) => {
    setLineSpacing(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(LINE_SPACING_KEY, next);
    applyLineSpacing(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} label={t('chrome.settings.title')}>
      <DialogHeader>
        <DialogTitle>{t('chrome.settings.title')}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div class="mb-4">
          <div class="mb-2 text-sm font-semibold text-foreground">
            {t('chrome.settings.fontSize')}
          </div>
          <SegmentedControl
            label={t('chrome.settings.fontSize')}
            value={fontSize}
            options={fontSizeOptions}
            onChange={selectFontSize}
          />
        </div>
        <div>
          <div class="mb-2 text-sm font-semibold text-foreground">
            {t('chrome.settings.lineSpacing')}
          </div>
          <SegmentedControl
            label={t('chrome.settings.lineSpacing')}
            value={lineSpacing}
            options={lineSpacingOptions}
            onChange={selectLineSpacing}
          />
        </div>
      </DialogBody>
    </Dialog>
  );
}

export function Settings(_props: SettingsProps = {}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('chrome.settings.title')}
        title={t('chrome.settings.title')}
      >
        <SettingsIcon size={18} aria-hidden="true" />
      </Button>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
