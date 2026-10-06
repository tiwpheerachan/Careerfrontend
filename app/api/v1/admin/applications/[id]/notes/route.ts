import { adminAddNote } from '@/lib/api/contracts';
import { handler, json, parseBody, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

/** POST /api/v1/admin/applications/{id}/notes */
export const POST = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request);
  const { id } = await parseParams(params, adminAddNote.params);
  const { body } = await parseBody(request, adminAddNote.body.schema);
  return json({ note: await store().applications.addNote(id, body, actor.email) }, 201);
});
