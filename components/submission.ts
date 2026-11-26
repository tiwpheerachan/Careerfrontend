import { SUBMISSION_HEADER, TURNSTILE_HEADER } from '@/lib/submission-headers';

const SALT_KEY = 'shd.submission.salt';

/** Longer than the server lets an upload take (lib/api/http.ts). */
export const SUBMIT_TIMEOUT_MS = 200_000;

/** A file as far as "the same file again" goes. */
export const fileMark = (file: File | null | undefined) =>
  file ? `${file.name}:${file.size}:${file.lastModified}` : '';

/**
 * The headers of a submission: the Turnstile token, and an id made from what is
 * sent. The same form sent again from this tab (after a lost answer) has the
 * same id, so it is saved once; changed, or after a success, it has a new one.
 */
export async function submissionHeaders(content: string, turnstileToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (turnstileToken) headers[TURNSTILE_HEADER] = turnstileToken;
  try {
    let salt = sessionStorage.getItem(SALT_KEY);
    if (!salt) sessionStorage.setItem(SALT_KEY, (salt = crypto.randomUUID()));
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + content)));
    const hex = [...hash.subarray(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
    // The version and variant digits a uuid must have (8: made by its own rule).
    headers[SUBMISSION_HEADER] =
      `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
  } catch {
    /* no storage or no crypto (plain http): sent without an id, as before */
  }
  return headers;
}

/** After a success: the same form sent on purpose is a new one. */
export function submissionDone(): void {
  try {
    sessionStorage.removeItem(SALT_KEY);
  } catch {
    /* nothing to forget */
  }
}
