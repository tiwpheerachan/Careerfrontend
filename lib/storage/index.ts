import 'server-only';
import { serverEnv } from '@/lib/env';
import { createLocalStore } from './local';
import { createSupabaseStore } from './supabase';

/**
 * Where uploaded files live. One interface, two places:
 *
 *   local     a folder on this machine (.storage/, gitignored) — development
 *   supabase  a PRIVATE Supabase Storage bucket — production
 *
 * Postgres keeps the object PATH (application_files.storage_path), never the
 * bytes and never a url: a url would bake one storage provider into every row.
 */
export interface ObjectStore {
  /** Writes a new object. Never overwrites: every path is fresh. */
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Removes objects; used to clean up after a failed application. Missing ones are ignored. */
  remove(paths: string[]): Promise<void>;
  /** The object's bytes (a download, or a photo drawn into a PDF). NotFoundError when it is gone. */
  read(path: string): Promise<Uint8Array>;
  /** Moves an object to a new path, in storage (no download). NotFoundError when `from` is not there. */
  move(from: string, to: string): Promise<void>;
}

let cached: ObjectStore | undefined;

export function objectStore(): ObjectStore {
  if (cached) return cached;
  const env = serverEnv();
  cached =
    env.STORAGE_DRIVER === 'supabase'
      ? createSupabaseStore({
          origin: env.NEXT_PUBLIC_SUPABASE_URL!,
          key: env.SUPABASE_SERVICE_ROLE_KEY!,
          bucket: env.STORAGE_BUCKET,
        })
      : createLocalStore(env.LOCAL_STORAGE_DIR);
  return cached;
}

/**
 * A stored file as the response itself, streamed through this server after the
 * caller's own sign-in check. Never a redirect to a signed storage url: that url
 * works for anyone who copies it (address bar, network tab, a chat) until it expires.
 */
export async function fileResponse(
  file: { path: string; name: string; type: string },
  disposition: 'inline' | 'attachment',
): Promise<Response> {
  const bytes = await objectStore().read(file.path);
  // The path's extension is the sniffed type; the uploader's name may not end in it ("cv.pdf?"),
  // and a download without it is a file the OS will not open.
  const ext = `.${file.path.split('.').pop()}`;
  const name = file.name.toLowerCase().endsWith(ext) ? file.name : file.name + ext;
  return new Response(bytes as BodyInit, {
    headers: {
      'content-type': file.type,
      // RFC 5987 so a Thai file name survives.
      'content-disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/**
 * `<folder>/<kind>-<n>.<ext>`. The folder is random and shared by one
 * application's files; the name is ours, not the uploader's — a file name is
 * user input and does not get to choose a storage key. The real name is kept
 * in application_files.file_name.
 */
export function objectPath(folder: string, kind: string, index: number, extension: string): string {
  return `${folder}/${kind.toLowerCase()}-${index}.${extension}`;
}
