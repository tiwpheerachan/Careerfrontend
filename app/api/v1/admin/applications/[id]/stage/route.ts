import { adminSetStage } from '@/lib/api/contracts';
import { handler, json, parseBody, parseParams, type RouteParams } from '@/lib/api/http';
import { presentApplication } from '@/lib/api/present';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

/**
 * PATCH /api/v1/admin/applications/{id}/stage — and answers with the whole
 * application, so the page shows the new stage and history at once (the old
 * admin's header badge stayed stale after a save).
 */
export const PATCH = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const { id } = await parseParams(params, adminSetStage.params);
  const { stage } = await parseBody(request, adminSetStage.body.schema);
  const repos = store();
  await repos.applications.setStage(id, stage, actor.email);
  return json({ application: presentApplication(await repos.applications.get(id)) });
});
