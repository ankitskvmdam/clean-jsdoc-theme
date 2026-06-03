import { useEffect, useRef, useState } from 'preact/hooks';
import { Settings as SettingsIcon, X } from 'lucide-preact';

// Empty by design — the island takes no server props; all state is read from
// localStorage on the client. Kept as a typed alias so the shape can grow.
export type SettingsProps = Record<string, never>;

type FontSize = 'sm' | 'md' | 'lg';
type LineSpacing = 'compact' | 'default' | 'relaxed';

// Storage keys + applied values are mirrored by dwar's pre-hydration script
// (packages/dwar/src/theme-script.ts) so preferences apply before first paint.
const FONT_SIZE_KEY = 'clean-font-size';
const LINE_SPACING_KEY = 'clean-line-spacing';

const FONT_SIZE_OPTIONS: ReadonlyArray<{ value: FontSize; label: string }> = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Default' },
  { value: 'lg', label: 'Large' },
];

const LINE_SPACING_OPTIONS: ReadonlyArray<{ value: LineSpacing; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'default', label: 'Default' },
  { value: 'relaxed', label: 'Relaxed' },
];

// 'md' / 'default' map to "no override" so the CSS defaults apply.
const FONT_SIZE_PX: Partial<Record<FontSize, string>> = { sm: '15px', lg: '18px' };
const LINE_HEIGHT: Partial<Record<LineSpacing, string>> = { compact: '1.4', relaxed: '1.8' };

function readStored<T extends string>(
  key: string,
  allowed: ReadonlyArray<T>,
  fallback: T,
): T {
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
      class="inline-flex items-center gap-1 rounded-md border border-[var(--clean-border)] p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          class="rounded px-3 py-1 text-sm text-[var(--clean-fg)] aria-pressed:bg-[var(--clean-accent)] aria-pressed:text-[var(--clean-accent-fg)]"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Settings(_props: SettingsProps = {}) {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>('default');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Reconcile state from storage on mount (dwar's pre-hydration script already
  // applied the visual values; this syncs the controls to match).
  useEffect(() => {
    setFontSize(readStored<FontSize>(FONT_SIZE_KEY, ['sm', 'md', 'lg'], 'md'));
    setLineSpacing(
      readStored<LineSpacing>(LINE_SPACING_KEY, ['compact', 'default', 'relaxed'], 'default'),
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

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Move focus into the dialog on open; restore it to the trigger on close.
  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => dialogRef.current?.focus());
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
        class="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--clean-fg-muted)] hover:bg-[var(--clean-bg-muted)] hover:text-[var(--clean-fg)]"
      >
        <SettingsIcon size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            tabIndex={-1}
            class="w-full max-w-lg rounded-lg border border-[var(--clean-border)] bg-[var(--clean-bg)] shadow-xl outline-none"
          >
            <div class="flex items-center justify-between border-b border-[var(--clean-border)] p-4">
              <h2 class="m-0 text-base font-semibold text-[var(--clean-fg)]">Settings</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close settings"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--clean-fg-muted)] hover:bg-[var(--clean-bg-muted)] hover:text-[var(--clean-fg)]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div class="p-4">
              <div class="mb-4">
                <div class="mb-2 text-sm font-semibold text-[var(--clean-fg)]">Font size</div>
                <SegmentedControl
                  label="Font size"
                  value={fontSize}
                  options={FONT_SIZE_OPTIONS}
                  onChange={selectFontSize}
                />
              </div>
              <div>
                <div class="mb-2 text-sm font-semibold text-[var(--clean-fg)]">Line spacing</div>
                <SegmentedControl
                  label="Line spacing"
                  value={lineSpacing}
                  options={LINE_SPACING_OPTIONS}
                  onChange={selectLineSpacing}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
