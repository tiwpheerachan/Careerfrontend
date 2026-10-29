import { adminDownloadFile } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { fileResponse } from '@/lib/storage';
import { store } from '@/lib/store';

/**
 * GET /api/v1/admin/applications/{id}/files/{fileId}
 *
 * Streamed through this server, never a storage url, so there is no link to
 * copy. Every download is logged with who asked.
 */
export const GET = handler<RouteParams<'id' | 'fileId'>>(async (request, { log }, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { id, fileId } = await parseParams(params, adminDownloadFile.params);
  const file = await store().applications.file(id, fileId);
  log.info({ actor: actor.email, applicationId: id, fileId }, 'application file opened');

  return fileResponse({ path: file.storagePath, name: file.fileName, type: file.contentType }, 'attachment');
});
