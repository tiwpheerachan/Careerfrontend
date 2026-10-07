import type { Instrumentation } from 'next';

/**
 * Runs once when a server instance starts, before it serves anything.
 *
 *   1. The environment is validated. A missing or malformed variable stops
 *      the process (exit 1) with a list of what is wrong.
 *   2. Sentry is initialised — only when SENTRY_DSN is set. Without it the
 *      SDK is never loaded and nothing leaves the server. (There is no Sentry
 *      account yet: create one, put the DSN in the env, redeploy. No code
 *      change is needed.)
 *
 * Reference: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { serverEnvOrExit } = await import('@/lib/env');
  const env = serverEnvOrExit();

  if (env.SENTRY_DSN) {
    const [Sentry, { SENTRY_DATA_COLLECTION }] = await Promise.all([
      import('@sentry/nextjs'),
      import('@/lib/sentry-options'),
    ]);
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
      // Errors only. Tracing is a separate decision, with its own cost.
      tracesSampleRate: 0,
      dataCollection: SENTRY_DATA_COLLECTION,
    });
  }

  const { log } = await import('@/lib/log');
  log.info({ sentry: Boolean(env.SENTRY_DSN), env: env.NODE_ENV }, 'server starting');

  // Development only, as in shd_onelink: where things are. A deployed server
  // has no npm to run and no collection beside it. Deferred so it lands under
  // Next's own banner rather than above it — this runs before the server is
  // ready, and the banner prints when it is.
  if (env.NODE_ENV !== 'development') return;
  const origin = `http://localhost:${process.env.PORT || '3000'}`;
  setTimeout(() => {
    console.log(`- Site:          ${origin}/th`);
    console.log(`- Admin:         ${origin}/admin`);
    console.log(`- API docs:      ${origin}/api-docs`);
    console.log('- API tests:     npm run api:test   (Bruno CLI, bruno/)');
    console.log(`- API spec:      ${origin}/api/v1/openapi.json`);
  }, 0);
}

/** Server errors Next.js caught (render, route handlers, proxy). Forwarded to Sentry when it is on. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(error, request, context);
};
