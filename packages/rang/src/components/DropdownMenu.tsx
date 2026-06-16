import type { ComponentChildren, JSX, RefObject } from 'preact';
import { createContext } from 'preact';
import { useContext, useEffect, useLayoutEffect, useId, useRef, useState } from 'preact/hooks';
import { cn } from '../lib/cn';

/**
 * shadcn-style DropdownMenu, ported to Preact (no Radix). A compound component:
 * compose {@link DropdownMenuTrigger}, {@link DropdownMenuContent}, and
 * {@link DropdownMenuItem} (plus {@link DropdownMenuSeparator} /
 * {@link DropdownMenuLabel}) inside a {@link DropdownMenu} root. The root owns
 * the shared open state and the plumbing every menu needs — outside-click and
 * Escape to close, focus restore to the trigger, and roving arrow-key focus
 * across items. Uncontrolled by default; pass `open` + `onOpenChange` to control.
 *
 *   <DropdownMenu>
 *     <DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>…</DropdownMenuTrigger>
 *     <DropdownMenuContent align="end">
 *       <DropdownMenuItem onSelect={…}>Copy page</DropdownMenuItem>
 *       <DropdownMenuItem href="…">Open in ChatGPT</DropdownMenuItem>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 */

interface DropdownCtx {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement>;
  contentRef: RefObject<HTMLDivElement>;
  menuId: string;
  triggerId: string;
}

const DropdownContext = createContext<DropdownCtx | null>(null);

function useDropdown(part: string): DropdownCtx {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error(`${part} must be used within <DropdownMenu>`);
  return ctx;
}

/** CSS selector for the focusable, enabled menu items inside the content. */
const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

export interface DropdownMenuProps {
  /** Controlled open state. Omit for an uncontrolled menu. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ComponentChildren;
  class?: string;
}

export function DropdownMenu({
  open: openProp,
  onOpenChange,
  children,
  class: cls,
}: DropdownMenuProps) {
  const [internal, setInternal] = useState(false);
  const open = openProp ?? internal;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = useId();

  const setOpen = (next: boolean): void => {
    if (openProp === undefined) setInternal(next);
    onOpenChange?.(next);
  };
  // Latest values for the mount-time listeners to read without re-binding.
  const openRef = useRef(open);
  const setOpenRef = useRef(setOpen);
  openRef.current = open;
  setOpenRef.current = setOpen;

  // Close on outside pointerdown (capture, so it fires before item handlers
  // can't run on a closed menu) and on Escape (restoring focus to the trigger).
  useEffect(() => {
    const onPointerDown = (e: PointerEvent): void => {
      if (!openRef.current) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      setOpenRef.current(false);
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!openRef.current || e.key !== 'Escape') return;
      e.preventDefault();
      setOpenRef.current(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef, contentRef, menuId, triggerId }}>
      <div class={cn('relative inline-block', cls)}>{children}</div>
    </DropdownContext.Provider>
  );
}

export type DropdownMenuTriggerProps = JSX.IntrinsicElements['button'];

/**
 * The button that toggles the menu. Style it yourself (e.g. with
 * `buttonVariants(...)`) — it only adds the menu wiring and ARIA. `ArrowDown`
 * and `Enter`/`Space` open the menu (which then focuses the first item).
 */
export function DropdownMenuTrigger({
  class: cls,
  children,
  onClick,
  onKeyDown,
  ...rest
}: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef, menuId, triggerId } = useDropdown('DropdownMenuTrigger');
  return (
    <button
      {...rest}
      ref={triggerRef}
      type="button"
      id={triggerId}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      class={cls}
      onClick={(e) => {
        onClick?.(e);
        setOpen(!open);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setOpen(true);
        }
      }}
    >
      {children}
    </button>
  );
}

export interface DropdownMenuContentProps {
  children?: ComponentChildren;
  /** Which edge of the trigger the menu aligns to. */
  align?: 'start' | 'end';
  /** Accessible label; defaults to being labelled by the trigger. */
  label?: string;
  class?: string;
}

/** Viewport gutter (px) kept between the menu and the window edge when shifting. */
const COLLISION_PADDING = 8;

export function DropdownMenuContent({
  children,
  align = 'start',
  label,
  class: cls,
}: DropdownMenuContentProps) {
  const { open, triggerRef, contentRef, menuId, triggerId } = useDropdown('DropdownMenuContent');
  // Outer positioning layer, positioned `fixed` (see below).
  const positionerRef = useRef<HTMLDivElement>(null);

  // Focus the first item when the menu opens (roving focus from there on).
  useEffect(() => {
    if (!open) return;
    contentRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
  }, [open]);

  // Fixed-position placement anchored to the trigger. Using `position: fixed`
  // (not `absolute`) lets the menu escape any ancestor with `overflow: hidden` —
  // e.g. a code-block card — that would otherwise clip it when the code content
  // is short. Coordinates are computed from the trigger's viewport rect: below
  // it by default, flipped above when it would overflow the bottom, and clamped
  // within the viewport horizontally. Recomputed before paint (no visible jump)
  // and on resize/scroll (capture, to catch nested scrollers) so it tracks the
  // trigger.
  useLayoutEffect(() => {
    if (!open) return;
    const positioner = positionerRef.current;
    const trigger = triggerRef.current;
    if (!positioner || !trigger) return;
    const place = (): void => {
      const tr = trigger.getBoundingClientRect();
      const menuW = positioner.offsetWidth;
      const menuH = positioner.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      let top = tr.bottom + 4;
      if (top + menuH > vh - COLLISION_PADDING && tr.top - 4 - menuH >= COLLISION_PADDING) {
        top = tr.top - 4 - menuH;
      }
      let left = align === 'end' ? tr.right - menuW : tr.left;
      left = Math.min(Math.max(COLLISION_PADDING, left), vw - COLLISION_PADDING - menuW);
      positioner.style.top = `${Math.round(top)}px`;
      positioner.style.left = `${Math.round(left)}px`;
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent): void => {
    const items = Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? []
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(index + 1 + items.length) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  };

  return (
    <div ref={positionerRef} class="fixed z-50">
      <div
        ref={contentRef}
        id={menuId}
        role="menu"
        aria-label={label}
        aria-labelledby={label ? undefined : triggerId}
        data-state="open"
        onKeyDown={onKeyDown}
        class={cn(
          'min-w-44 rounded-xl border border-border bg-background p-1 shadow-lg outline-none',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          cls
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface DropdownMenuItemProps {
  children?: ComponentChildren;
  /** Fired when the item is activated (click / Enter / Space); the menu closes after. */
  onSelect?: () => void;
  /** Render as a link (e.g. "Open in ChatGPT") instead of a button. */
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  class?: string;
}

export function DropdownMenuItem({
  children,
  onSelect,
  href,
  target,
  rel,
  disabled,
  class: cls,
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdown('DropdownMenuItem');
  const activate = (): void => {
    if (disabled) return;
    onSelect?.();
    setOpen(false);
  };
  const shared = cn(
    'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm text-foreground no-underline outline-none',
    'cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
    disabled && 'pointer-events-none opacity-50',
    cls
  );
  // tabIndex -1: items are reached via arrow keys (roving focus), not Tab.
  if (href && !disabled) {
    return (
      <a
        role="menuitem"
        tabIndex={-1}
        href={href}
        target={target}
        rel={rel}
        class={shared}
        onClick={activate}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      class={shared}
      onClick={activate}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ class: cls }: { class?: string }) {
  return <div role="separator" class={cn('-mx-1 my-1 h-px bg-border', cls)} />;
}

export function DropdownMenuLabel({
  children,
  class: cls,
}: {
  children?: ComponentChildren;
  class?: string;
}) {
  return (
    <div class={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', cls)}>{children}</div>
  );
}
