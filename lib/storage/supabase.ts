import { UnavailableError } from '@/lib/errors';
import type { ObjectStore } from './index';

/**
 * Supabase Storage over its REST API with fetch — the same approach as
 * shd_onelink (lib/api/storage.ts): three calls, no client library.
 *
 * The bucket must be PRIVATE. Résumés are personal data: nothing in it is
 * reachable without a signed url, and those are minted per click, for a
 * minute, only by the admin API. (The old site's bucket was public, and its
 * public urls were also copied into a Google Sheet.)
 */
export function createSupabaseStore(options: { origin: string; key: string; bucket: string }): ObjectStore {
  const base = `${options.origin.replace(/\/+$/, '')}/storage/v1`;
  const encode = (objectPath: string) => objectPath.split('/').map(encodeURIComponent).join('/');

  async function call(route: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${base}/${route}`, {
        ...init,
        // Both headers, as the official client sends: the gateway routes on
        // `apikey`, Storage authorises on `authorization`.
        headers: { apikey: options.key, authorization: `Bearer ${options.key}`, ...init.headers },
        cache: 'no-store',
      });
    } catch (error) {
      throw new UnavailableError(`File storage is unreachable: ${error instanceof Error ? error.message : error}`);
    }
  }

  return {
    async put(objectPath, bytes, contentType) {
      const response = await call(`object/${options.bucket}/${encode(objectPath)}`, {
        method: 'POST',
        headers: { 'content-type': contentType, 'x-upsert': 'false' },
        body: bytes as BodyInit,
      });
      if (!response.ok) throw new Error(`Storage upload failed (${response.status}): ${await response.text()}`);
    },

    async remove(paths) {
      if (paths.length === 0) return;
      const response = await call(`object/${options.bucket}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prefixes: paths }),
      });
      if (!response.ok) throw new Error(`Storage delete failed (${response.status}): ${await response.text()}`);
    },

    async open(objectPath, downloadName) {
      const response = await call(`object/sign/${options.bucket}/${encode(objectPath)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expiresIn: 60 }),
      });
      if (!response.ok) throw new Error(`Storage sign failed (${response.status}): ${await response.text()}`);
      const { signedURL } = (await response.json()) as { signedURL: string };
      // `download=` makes the browser save it under its real name.
      const url = new URL(`${base}${signedURL}`);
      url.searchParams.set('download', downloadName);
      return { redirect: url.toString() };
    },
  };
}
