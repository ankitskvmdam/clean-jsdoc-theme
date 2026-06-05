import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { X } from 'lucide-preact';
import { Button } from './Button';
import { cn } from '../lib/cn';

// Exit-animation duration. Must match the `duration-200` class on the panel so
// the element stays mounted long enough for the close animation to finish.
const ANIM_MS = 200;

/**
 * shadcn-style Dialog, ported to Preact (no Radix). Controlled: the caller owns
 * `open` + `onOpenChange`. Centralizes the modal plumbing every dialog needs —
 * overlay, Escape, click-outside, focus trap, body-scroll lock, and focus
 * restore to the opener — so consumers only supply content.
 *
 * Compose with DialogHeader / DialogTitle / DialogBody / DialogFooter, mirroring
 * shadcn's part API.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible label for the dialog surface. */
  label?: string;
  /**
   * Placement of the surface:
   *   - `center` (default) / `top` — a centered or top-anchored modal (zoom).
   *   - `left` / `right` — a full-height side sheet that slides in from that
   *     edge (used for the mobile nav drawer).
   */
  align?: 'center' | 'top' | 'left' | 'right';
  /** Render the built-in top-right close button (default true). */
  showClose?: boolean;
  /** Extra classes on the content panel. */
  class?: string;
  children?: ComponentChildren;
}

export function Dialog({
  open,
  onOpenChange,
  label,
  align = 'center',
  showClose = true,
  class: cls,
  children,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Presence: keep the panel mounted through the close animation. `mounted`
  // lags `open` by ANIM_MS on the open→closed transition so the exit animation
  // (data-state="closed") can play before we unmount.
  const [mounted, setMounted] = useState(open);
  // Latest values for the mount-time keydown listener to read without
  // re-binding (and so the listener is present regardless of `open` effect
  // timing — important for Escape to work the instant the dialog opens).
  const openRef = useRef(open);
  const onOpenChangeRef = useRef(onOpenChange);
  openRef.current = open;
  onOpenChangeRef.current = onOpenChange;

  // Keyboard: Escape closes; Tab is trapped within the panel. Registered once.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!openRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChangeRef.current(false);
        return;
      }
      if (e.key === 'Tab' && contentRef.current) {
        const focusables = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Side-effects tied to the open transition: focus into the panel, lock body
  // scroll, and restore focus to the opener on close.
  useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;

    openerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const raf = window.requestAnimationFrame(() => contentRef.current?.focus());
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      openerRef.current?.focus();
    };
  }, [open]);

  // Drive the mounted lag: mount immediately on open, defer unmount on close so
  // the exit animation can play. Under reduced motion there's no animation to
  // wait for, so unmount immediately (avoids a static hold).
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setMounted(false);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), ANIM_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  // Render while open (so the panel mounts immediately, before `mounted`
  // catches up) and while closing (so the exit animation can play).
  if (!open && !mounted) return null;

  const state = open ? 'open' : 'closed';
  const isSheet = align === 'left' || align === 'right';

  return (
    <div
      data-state={state}
      class={cn(
        'fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm',
        'duration-200 fill-mode-forwards',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        isSheet
          ? align === 'left'
            ? 'justify-start'
            : 'justify-end'
          : cn('justify-center p-4', align === 'top' ? 'items-start pt-24' : 'items-center')
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-state={state}
        tabIndex={-1}
        class={cn(
          'relative bg-background shadow-lg outline-none border-border',
          'duration-200 fill-mode-forwards data-[state=open]:animate-in data-[state=closed]:animate-out',
          isSheet
            ? cn(
                'flex h-full w-4/5 flex-col overflow-y-auto',
                align === 'left'
                  ? 'border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left'
                  : 'border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right'
              )
            : cn(
                'w-full max-w-lg rounded-2xl border',
                'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
                'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95'
              ),
          cls
        )}
      >
        {showClose && (
          <div class="absolute right-3 top-3">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X size={16} aria-hidden="true" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface DialogSectionProps {
  children?: ComponentChildren;
  class?: string;
}

export function DialogHeader({ children, class: cls }: DialogSectionProps) {
  return <div class={cn('border-b border-border px-5 py-4', cls)}>{children}</div>;
}

export function DialogTitle({ children, class: cls }: DialogSectionProps) {
  return <h2 class={cn('m-0 text-base font-semibold text-foreground', cls)}>{children}</h2>;
}

export function DialogBody({ children, class: cls }: DialogSectionProps) {
  return <div class={cn('p-5', cls)}>{children}</div>;
}

export function DialogFooter({ children, class: cls }: DialogSectionProps) {
  return (
    <div class={cn('flex justify-end gap-2 border-t border-border px-5 py-3', cls)}>{children}</div>
  );
}
