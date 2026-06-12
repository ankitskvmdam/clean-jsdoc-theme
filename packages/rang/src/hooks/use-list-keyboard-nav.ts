import { useEffect, useRef, useState } from 'preact/hooks';

export interface ListKeyboardNav {
  /** The currently highlighted index. */
  active: number;
  /** Imperatively set the active index (e.g. reset on open, sync with hover). */
  setActive: (index: number) => void;
}

export interface UseListKeyboardNavOptions {
  /** Only handle keys while true (e.g. while a palette/menu is open). */
  enabled: boolean;
  /** Number of navigable items; arrow keys wrap within `[0, count)`. */
  count: number;
  /** Called with the active index when Enter is pressed on a non-empty list. */
  onSelect: (index: number) => void;
}

/**
 * Roving keyboard navigation for a list/listbox: ArrowDown/ArrowUp move a
 * wrapping "active" index and Enter selects it, via a single global `keydown`
 * listener that only acts while `enabled`. Generic and dependency-free, so any
 * component with a navigable list (command palette, menu, combobox, …) can reuse
 * it. `count`, `enabled`, and `onSelect` are read through refs, so the listener
 * always sees the latest values without rebinding.
 */
export function useListKeyboardNav({
  enabled,
  count,
  onSelect,
}: UseListKeyboardNavOptions): ListKeyboardNav {
  const [active, setActive] = useState(0);
  const enabledRef = useRef(enabled);
  const countRef = useRef(count);
  const activeRef = useRef(active);
  const onSelectRef = useRef(onSelect);
  enabledRef.current = enabled;
  countRef.current = count;
  activeRef.current = active;
  onSelectRef.current = onSelect;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current || countRef.current === 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((prev) => {
          const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1;
          return (next + countRef.current) % countRef.current;
        });
      } else if (e.key === 'Enter') {
        onSelectRef.current(activeRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { active, setActive };
}
