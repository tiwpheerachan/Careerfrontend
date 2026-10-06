import { submitApplication } from '@/lib/api/apply';
import { apply } from '@/lib/api/contracts';
import { handler, json, parseParams, type RouteParams } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

/** POST /api/v1/jobs/{code}/applications — the application form (multipart). See lib/api/apply.ts. */
export const POST = handler<RouteParams<'code'>>(async (request, { log }, { params }) => {
  const { code } = await parseParams(params, apply.params);
  const created = await submitApplication(request, code, log);
  return json(created, 201);
});
