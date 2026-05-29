import { useEffect, useRef, useState } from 'preact/hooks';
import type { NavNode } from '@clean-jsdoc-theme/utils';
import { Sidebar } from './Sidebar';

export interface MobileNavProps {
  nav: NavNode[];
  currentSlug: string;
}

export function MobileNav({ nav, currentSlug }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Body-scroll lock while drawer is open keeps the page underneath stable.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
      // Focus trap: tab cycles within the drawer.
      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
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
  }, [open]);

  useEffect(() => {
    if (!open && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open]);

  return (
    <div class="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        class="inline-flex items-center justify-center rounded p-2 text-[var(--clean-fg)] hover:bg-[var(--clean-bg-muted)]"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div
        class={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={open ? 'false' : 'true'}
      >
        <div
          class={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          class={`absolute left-0 top-0 h-full w-72 transform overflow-y-auto bg-[var(--clean-bg)] p-4 shadow-xl transition-transform ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div class="mb-4 flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--clean-fg)]">Navigation</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              class="inline-flex h-8 w-8 items-center justify-center rounded text-[var(--clean-fg)] hover:bg-[var(--clean-bg-muted)]"
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <Sidebar nav={nav} currentSlug={currentSlug} />
        </div>
      </div>
    </div>
  );
}
