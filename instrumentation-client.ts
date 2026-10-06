import { SENTRY_DATA_COLLECTION } from '@/lib/sentry-options';

/**
 * Browser-side error reporting. Off unless NEXT_PUBLIC_SENTRY_DSN is set at
 * build time — without it the SDK is not even downloaded.
 *
 * Reference: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      tracesSampleRate: 0,
      dataCollection: SENTRY_DATA_COLLECTION,
    });
  });
}
