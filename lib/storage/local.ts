import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NotFoundError } from '@/lib/errors';
import type { ObjectStore } from './index';

/**
 * Files on this machine's disk, for development only (lib/env.ts refuses it in
 * production: Render's disk is wiped on every deploy). The folder is gitignored.
 */
export function createLocalStore(directory: string): ObjectStore {
  const root = path.resolve(directory);

  /** The file for an object path — refused if it would land outside the folder. */
  function fileOf(objectPath: string): string {
    const file = path.resolve(root, objectPath);
    if (!file.startsWith(root + path.sep)) throw new Error(`Refusing an object path outside storage: ${objectPath}`);
    return file;
  }

  return {
    async put(objectPath, bytes) {
      const file = fileOf(objectPath);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes, { flag: 'wx' });
    },

    async remove(paths) {
      await Promise.all(paths.map((p) => rm(fileOf(p), { force: true })));
    },

    async open(objectPath) {
      const bytes = await readFile(fileOf(objectPath)).catch((error: NodeJS.ErrnoException) => {
        throw error.code === 'ENOENT' ? new NotFoundError('file', objectPath) : error;
      });
      return { bytes: new Uint8Array(bytes), contentType: 'application/octet-stream' };
    },
  };
}
