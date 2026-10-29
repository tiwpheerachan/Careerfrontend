import { access, mkdir, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises';
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

  async function read(objectPath: string): Promise<Uint8Array> {
    const bytes = await readFile(fileOf(objectPath)).catch((error: NodeJS.ErrnoException) => {
      throw error.code === 'ENOENT' ? new NotFoundError('file', objectPath) : error;
    });
    return new Uint8Array(bytes);
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

    read,

    async move(from, to) {
      const source = fileOf(from);
      const target = fileOf(to);
      await access(source).catch(() => {
        throw new NotFoundError('file', from);
      });
      // Never over an existing object, as put() never overwrites.
      if (
        await access(target).then(
          () => true,
          () => false,
        )
      )
        throw new Error(`Refusing to move over ${to}`);
      await mkdir(path.dirname(target), { recursive: true });
      await rename(source, target);
      // The folder it left, if that was its last file (rmdir refuses one that is not empty).
      await rmdir(path.dirname(source)).catch(() => {});
    },
  };
}
