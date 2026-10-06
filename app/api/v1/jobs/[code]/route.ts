import { getJob } from '@/lib/api/contracts';
import { handler, json, parseParams, parseQuery, type RouteParams } from '@/lib/api/http';
import { NotFoundError } from '@/lib/errors';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/jobs/{code} — one published job. Drafts and closed jobs are 404. */
export const GET = handler<RouteParams<'code'>>(async (request, _context, { params }) => {
  const { code } = await parseParams(params, getJob.params);
  const { locale } = parseQuery(request, getJob.query);
  const job = await store().jobs.getPublic(code, locale);
  if (!job) throw new NotFoundError('job', code);
  return json({ job });
});
