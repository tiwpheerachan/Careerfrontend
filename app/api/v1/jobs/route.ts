import { listJobs } from '@/lib/api/contracts';
import { handler, json, parseQuery } from '@/lib/api/http';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/jobs — published jobs, plus the filter values (lib/api/contracts.ts). */
export const GET = handler(async (request) => {
  const query = parseQuery(request, listJobs.query);
  const repos = store();
  const [jobs, facets] = await Promise.all([
    repos.jobs.listPublic({
      locale: query.locale,
      q: query.q,
      countryCode: query.country,
      department: query.department,
      level: query.level,
    }),
    repos.jobs.publicFacets(),
  ]);
  return json({ jobs, total: jobs.length, facets });
});
