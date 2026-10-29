import { adminApplicationFormResume } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { fileResponse } from '@/lib/storage';
import { store } from '@/lib/store';

/**
 * GET /api/v1/admin/application-forms/{id}/resume — the résumé/CV sent with the
 * form, streamed as an application's files are. Kept in the audit trail.
 */
export const GET = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { id } = await parseParams(params, adminApplicationFormResume.params);
  const resume = await store().applicationForms.resume(id);

  return fileResponse(resume, 'attachment');
});
