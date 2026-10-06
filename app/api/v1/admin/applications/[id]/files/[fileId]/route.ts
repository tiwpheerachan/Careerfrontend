import { adminDownloadFile } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { objectStore } from '@/lib/storage';
import { store } from '@/lib/store';

/**
 * GET /api/v1/admin/applications/{id}/files/{fileId}
 *
 * Signs the link at the moment of the click — a 60-second Supabase url in
 * production, the bytes themselves in development — so a link on an open page
 * never goes stale. Every download is logged with who asked.
 */
export const GET = handler<RouteParams<'id' | 'fileId'>>(async (request, { log }, { params }) => {
  const actor = await requireAdmin(request);
  const { id, fileId } = await parseParams(params, adminDownloadFile.params);
  const file = await store().applications.file(id, fileId);
  log.info({ actor: actor.email, applicationId: id, fileId }, 'application file opened');

  const opened = await objectStore().open(file.storagePath, file.fileName);
  if ('redirect' in opened) {
    return new Response(null, { status: 302, headers: { location: opened.redirect, 'cache-control': 'no-store' } });
  }
  return new Response(opened.bytes as BodyInit, {
    headers: {
      'content-type': file.contentType,
      // RFC 5987 so a Thai file name survives.
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
});
