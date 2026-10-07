import { adminDeleteNote } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

/** DELETE /api/v1/admin/applications/{id}/notes/{noteId} — soft delete. */
export const DELETE = handler<RouteParams<'id' | 'noteId'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const { id, noteId } = await parseParams(params, adminDeleteNote.params);
  await store().applications.deleteNote(id, noteId, actor.email);
  return new Response(null, { status: 204 });
});
