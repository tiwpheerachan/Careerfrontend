import { permanentRedirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { store } from '@/lib/store';

/**
 * A job url the new site does not know may be an OLD one: the old site used
 * its free-text job_id in urls (/jobs/SHD-TH-%20Accounting%20-%20AP).
 * Imported jobs remember that id (jobs.legacy_code); this sends such a url to
 * the job's new address with a 308, so links shared before the move still
 * work. Returns normally when there is no such job (the caller 404s).
 */
export async function redirectLegacyJob(code: string, locale: Locale, suffix = ''): Promise<void> {
  let legacy = code;
  try {
    legacy = decodeURIComponent(code);
  } catch {
    /* already decoded */
  }
  const current = await store().jobs.codeForLegacy(legacy);
  if (current) permanentRedirect(`/${locale}/jobs/${encodeURIComponent(current)}${suffix}`);
}
