import clsx, { type ClassValue } from 'clsx';

/**
 * Joins class names WITHOUT tailwind-merge — what the old site's `cn` did.
 *
 * The ported pages were written against plain clsx: when two classes conflict
 * (px-4 and px-6), both are kept and the stylesheet decides. tailwind-merge
 * would drop one and could change how a page looks, so ported markup uses
 * this. shadcn components and new code use `cn` from lib/utils.
 */
export function cx(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
