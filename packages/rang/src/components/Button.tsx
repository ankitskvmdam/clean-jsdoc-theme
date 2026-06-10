import type { JSX } from 'preact';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * shadcn-style Button, ported to Preact. Variant + size are cva-driven and
 * resolve to the semantic theme tokens (see dwar's `@theme` mapping).
 *
 * Note: Preact function components don't forward refs by default, and we avoid
 * pulling in `preact/compat` just for that. Call sites that need a ref on the
 * underlying element use `buttonVariants(...)` on a native `<button>` instead.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-xs': 'h-6 w-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends Omit<JSX.IntrinsicElements['button'], 'size'>, VariantProps<typeof buttonVariants> {}

export function Button({ class: cls, variant, size, ...props }: ButtonProps) {
  return (
    <button class={cn(buttonVariants({ variant, size }), cls as string | undefined)} {...props} />
  );
}
