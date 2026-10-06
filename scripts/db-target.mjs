/**
 * Which database a script is about to touch, and whether it may.
 *
 *   a local database (localhost, 127.0.0.1, ::1, a compose service name)
 *   is always fair game;
 *
 *   anything else is production as far as these scripts are concerned, and
 *   is touched only when SHD_ALLOW_PRODUCTION=1 — which scripts/db.mjs sets
 *   after someone types "production" at the prompt, or on the deploy host.
 *
 * Plain .mjs on purpose: the .ts scripts, drizzle.config.ts, lib/db/client.ts
 * and db.mjs all import it, and each runs under a different loader.
 * Copied from shd_onelink.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'host.docker.internal', 'db', 'postgres']);

/** host, port and database of a postgres URL, and whether it is on this machine. */
export function describeTarget(url) {
  const parsed = new URL(url);
  const host = parsed.hostname;
  return {
    host,
    port: parsed.port || '5432',
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')) || '(default)',
    local: LOCAL_HOSTS.has(host),
  };
}

/** "127.0.0.1:55434/shd_career_db_dev" — never the user or password. */
export const targetLabel = (target) => `${target.host}:${target.port}/${target.database}`;

export const productionAllowed = () => process.env.SHD_ALLOW_PRODUCTION === '1';

/** Throws unless `url` is local or production was explicitly allowed. `task` names what was about to happen. */
export function assertMayTouch(url, task) {
  const target = describeTarget(url);
  if (target.local || productionAllowed()) return target;
  throw new Error(
    [
      `Refusing to run ${task} against ${targetLabel(target)}: that is not a local database.`,
      'Scripts treat every non-local database as production.',
      'For development use the npm run db:dev:* scripts (docker-compose.yml).',
      'If production really is meant, use the npm run db:prod:* script, which asks first.',
    ].join('\n'),
  );
}
