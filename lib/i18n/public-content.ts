import { revalidatePath } from 'next/cache';
import { log } from '@/lib/log';
import { clearPublicMessages } from './public-messages';

/**
 * After an admin write that shows on the public site (text, jobs): the cached
 * pages are made anew on their next visit. A failure is logged, never the
 * write's — it is done, and the pages catch up by themselves (revalidate in
 * app/[locale]/layout.tsx).
 */
export function publicContentChanged(): void {
  clearPublicMessages();
  try {
    revalidatePath('/[locale]', 'layout');
  } catch (err) {
    log.error({ err }, 'public pages not revalidated');
  }
}
