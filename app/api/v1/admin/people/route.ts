import { adminSearchPeople } from '@/lib/api/contracts';
import { handler, json, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { searchPeople } from '@/lib/auth/directory';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/people?q= — the company directory, for inviting evaluators. */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const { q } = parseQuery(request, adminSearchPeople.query);
  return json({ people: await searchPeople(q) });
});
