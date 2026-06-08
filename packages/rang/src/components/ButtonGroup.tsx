import type { ComponentChildren } from 'preact';
import { cn } from '../lib/cn';

export interface ButtonGroupProps {
  children?: ComponentChildren;
  /**
   * Layout axis. `horizontal` (default) joins children left↔right; `vertical`
   * stacks and joins them top↔bottom.
   */
  orientation?: 'horizontal' | 'vertical';
  /** Accessible label for the group. */
  label?: string;
  class?: string;
}

/**
 * shadcn-style ButtonGroup: lays out adjacent buttons (or button-like children)
 * as a single segmented control. Direct children lose their inner border radii
 * and their shared 1px border is collapsed (`-ml-px` / `-mt-px`), so the row
 * reads as one connected unit with only its outer corners rounded. A focused
 * child lifts above its neighbor (`z-10`) so its focus ring isn't clipped.
 *
 * Compose with {@link Button} for a segmented control, or pair a {@link Button}
 * with a {@link DropdownMenu} trigger for a split button.
 */
export function ButtonGroup({
  children,
  orientation = 'horizontal',
  label,
  class: cls,
}: ButtonGroupProps) {
  const horizontal = orientation !== 'vertical';
  return (
    <div
      role="group"
      aria-label={label}
      data-orientation={orientation}
      class={cn(
        'inline-flex w-fit items-stretch',
        horizontal ? 'flex-row' : 'flex-col',
        '[&>*]:relative [&>*]:rounded-none [&>*:focus-visible]:z-10',
        horizontal
          ? '[&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>*:not(:first-child)]:-ml-px'
          : '[&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md [&>*:not(:first-child)]:-mt-px',
        cls,
      )}
    >
      {children}
    </div>
  );
}
