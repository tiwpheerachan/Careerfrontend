import { NotFoundError, UnavailableError } from '@/lib/errors';
import type { ObjectStore } from './index';

/** Long enough for a 10 MB file; a storage that stopped answering must not hold an upload for ever. */
const TIMEOUT_MS = 60_000;

/**
 * Supabase Storage over its REST API with fetch — the same approach as
 * shd_onelink (lib/api/storage.ts): a few calls, no client library.
 *
 * The bucket must be PRIVATE. Résumés are personal data: nothing in it is
 * reachable without the service key, which only this server holds, and no
 * signed url is ever minted — downloads stream through the app (fileResponse).
 * (The old site's bucket was public, and its public urls were also copied into
 * a Google Sheet.)
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
        signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new UnavailableError(`File storage is unreachable: ${error instanceof Error ? error.message : error}`);
    }
  }

  async function fetchObject(objectPath: string): Promise<Response> {
    // Until the answer starts, not until it ends: a large download to a slow client takes its time.
    const starting = new AbortController();
    const timer = setTimeout(() => starting.abort(), TIMEOUT_MS);
    const response = await call(`object/authenticated/${options.bucket}/${encode(objectPath)}`, {
      method: 'GET',
      signal: starting.signal,
    }).finally(() => clearTimeout(timer));
    if (response.status === 404 || response.status === 400) {
      await response.body?.cancel();
      throw new NotFoundError('file', objectPath);
    }
    if (!response.ok) throw new Error(`Storage read failed (${response.status}): ${await response.text()}`);
    return response;
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

    async move(from, to) {
      const response = await call('object/move', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bucketId: options.bucket, sourceKey: from, destinationKey: to }),
      });
      if (!response.ok) {
        const body = await response.text();
        if (response.status === 404 || (response.status === 400 && /not.?found/i.test(body)))
          throw new NotFoundError('file', from);
        throw new Error(`Storage move failed (${response.status}): ${body}`);
      }
    },

    async open(objectPath) {
      const response = await fetchObject(objectPath);
      return response.body ?? '';
    },

    async read(objectPath) {
      return new Uint8Array(await (await fetchObject(objectPath)).arrayBuffer());
    },
  };
}
