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
  /**
   * How the admin gets the file: a short-lived signed url to send them to, or
   * the bytes to stream. Asked for at click time, so it never expires on an
   * open page (the old admin's 1-hour links did).
   */
  open(path: string, downloadName: string): Promise<{ redirect: string } | { bytes: Uint8Array; contentType: string }>;
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
 * `<folder>/<kind>-<n>.<ext>`. The folder is random and shared by one
 * application's files; the name is ours, not the uploader's — a file name is
 * user input and does not get to choose a storage key. The real name is kept
 * in application_files.file_name.
 */
export function objectPath(folder: string, kind: string, index: number, extension: string): string {
  return `${folder}/${kind.toLowerCase()}-${index}.${extension}`;
}
