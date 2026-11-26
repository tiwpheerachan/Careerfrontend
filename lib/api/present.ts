import type { ApplicationDetail } from '@/lib/repositories/applications';

/**
 * Repository results as the API sends them. The storage path of a file never
 * leaves the server: the admin gets this API's download endpoint instead,
 * which streams the file itself after the sign-in check (no signed links).
 */
export function presentApplication(application: ApplicationDetail) {
  return {
    ...application,
    files: application.files.map(({ storagePath: _path, ...file }) => ({
      ...file,
      downloadUrl: `/api/v1/admin/applications/${application.id}/files/${file.id}`,
    })),
  };
}
