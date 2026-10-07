import 'server-only';
import { UnavailableError } from '@/lib/errors';
import { log } from '@/lib/log';
import { SSO_ORIGIN } from './sso';

/**
 * The company directory, from the central system (GET /api/v1/directory/search,
 * the app's directory:read:people grant) — for "type a name, pick the person"
 * when inviting evaluators. Picking beats typing an email: a typo there fails
 * silently, and the person it was meant for never gets in.
 *
 * Server only: the key (CENTRAL_API_KEY) can message any employee in the name
 * of an internal system. Nothing here reaches the browser but the results.
 */
export interface Person {
  unionId: string | null;
  name: string;
  enName: string | null;
  email: string;
  jobTitle: string | null;
  department: string | null;
}

/** The central system refuses shorter searches (400 query_too_short). */
export const DIRECTORY_MIN_QUERY = 2;

interface DirectoryItem {
  union_id?: unknown;
  name?: unknown;
  en_name?: unknown;
  email?: unknown;
  job_title?: unknown;
  departments?: unknown;
}

const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** People matching a name or email; only those with an email (the only way they can sign in to match). */
export async function searchPeople(q: string, limit = 20): Promise<Person[]> {
  const key = process.env.CENTRAL_API_KEY?.trim();
  if (!key) throw new UnavailableError('The company directory is not connected (CENTRAL_API_KEY is not set).');
  if (q.trim().length < DIRECTORY_MIN_QUERY) return [];

  let response: Response;
  try {
    response = await fetch(
      `${SSO_ORIGIN}/api/v1/directory/search?${new URLSearchParams({ q: q.trim(), limit: String(limit) })}`,
      { headers: { authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
  } catch (err) {
    log.error({ err }, 'directory: central system unreachable');
    throw new UnavailableError('Could not reach the company directory. Please try again.');
  }
  if (!response.ok) {
    log.error({ status: response.status }, 'directory: search failed');
    throw new UnavailableError('The company directory did not answer. Please try again.');
  }
  const body = (await response.json().catch(() => null)) as { items?: DirectoryItem[] } | null;
  return (body?.items ?? []).flatMap((item) => {
    const email = str(item.email);
    const name = str(item.name) ?? str(item.en_name);
    if (!email || !name) return [];
    const departments = Array.isArray(item.departments) ? item.departments.filter((d) => typeof d === 'string') : [];
    return [
      {
        unionId: str(item.union_id),
        name,
        enName: str(item.en_name),
        email: email.toLowerCase(),
        jobTitle: str(item.job_title),
        department: (departments[0] as string | undefined) ?? null,
      },
    ];
  });
}
