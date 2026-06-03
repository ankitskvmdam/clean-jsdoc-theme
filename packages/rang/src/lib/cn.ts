import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn's class-merge helper: compose conditional classes (clsx) and resolve
 * conflicting Tailwind utilities so a caller-supplied class wins (tailwind-merge).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
