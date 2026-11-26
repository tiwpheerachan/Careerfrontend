import { captureException, init } from '@sentry/nextjs';
import { SENTRY_DATA_COLLECTION } from './sentry-options';

/** The browser's Sentry. Its own module so only these two are bundled, not replay and feedback. */
export function initSentry(dsn: string): void {
  init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    tracesSampleRate: 0,
    dataCollection: SENTRY_DATA_COLLECTION,
  });
}

/** An error a page's error boundary caught. */
export const reportError = (error: unknown) => void captureException(error);
