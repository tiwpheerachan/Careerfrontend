import { statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Lets plain `node` run the app's own TypeScript modules.
 *
 * The scripts in this folder import what the app imports, and that source is
 * written for a bundler: it uses the "@/" alias from tsconfig.json, and it
 * omits file extensions. Next and tsc resolve both. Node resolves neither —
 * it has no way to express a bare "@/" prefix in package.json "imports"
 * (which requires a leading "#"), and its ESM resolver never guesses an
 * extension or an index file.
 *
 * A synchronous resolve hook covers both, with no bundler, no ts-node and no
 * dependency. Node's own type stripping handles the TypeScript itself.
 */
const root = pathToFileURL(`${import.meta.dirname}/../`).href;

const SUFFIXES = ['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js'];

const isFile = (url) => {
  try {
    return statSync(fileURLToPath(url)).isFile();
  } catch {
    return false;
  }
};

/** The first candidate that is a real file, or the input unchanged. */
function withExtension(url) {
  if (isFile(url)) return url;
  for (const suffix of SUFFIXES) {
    if (isFile(`${url}${suffix}`)) return `${url}${suffix}`;
  }
  return url;
}

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
      return next(withExtension(new URL(specifier.slice(2), root).href), context);
    }
    // Relative imports between those same modules are extensionless too, and
    // some of them point at a directory with an index.ts.
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      return next(withExtension(new URL(specifier, context.parentURL).href), context);
    }
    return next(specifier, context);
  },
});
