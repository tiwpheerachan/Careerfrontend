import { adminApplicationFormResume } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { objectStore } from '@/lib/storage';
import { store } from '@/lib/store';

/**
 * GET /api/v1/admin/application-forms/{id}/resume — the résumé/CV sent with the
 * form, signed at the click as an application's files are (a 60-second
 * Supabase url in production, the bytes in development). Kept in the audit trail.
 */
export const GET = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { id } = await parseParams(params, adminApplicationFormResume.params);
  const resume = await store().applicationForms.resume(id);

  const opened = await objectStore().open(resume.path, resume.name);
  if ('redirect' in opened) {
    return new Response(null, { status: 302, headers: { location: opened.redirect, 'cache-control': 'no-store' } });
  }
  return new Response(opened.bytes as BodyInit, {
    headers: {
      'content-type': resume.type,
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(resume.name)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
});
