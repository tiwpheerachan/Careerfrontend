import type { init } from '@sentry/nextjs';

// Taken from init()'s own options: @sentry/nextjs does not re-export the type,
// and @sentry/core is only a transitive dependency.
type DataCollection = NonNullable<NonNullable<Parameters<typeof init>[0]>['dataCollection']>;

/**
 * What Sentry may collect — almost nothing beyond the error and its stack.
 *
 * Sentry's defaults collect request and response bodies, headers, cookies,
 * query strings, database query data and local variables. On this site those
 * carry applicants' names, emails, phone numbers and session cookies, so every
 * one is switched off. Shared by the server (instrumentation.ts) and the
 * browser (instrumentation-client.ts).
 */
export const SENTRY_DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
  genAI: { inputs: false, outputs: false },
  graphQL: { document: false, variables: false },
  queues: false,
};
