import type { z } from 'zod';

/**
 * One endpoint of /api/v1, described once.
 *
 * The route handler validates with these schemas (parseQuery / parseBody /
 * parseParams in lib/api/http.ts) and lib/api/openapi.ts describes the API
 * from the same objects — so what the docs say is what the code checks.
 * tests/lib/contracts.test.ts holds the list to the route files that exist.
 */
export interface Endpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  /** OpenAPI path under /api/v1, e.g. `/jobs/{code}`. */
  path: string;
  tag: string;
  summary: string;
  description?: string;
  /** public = anyone; admin = the admin gate (lib/auth/admin.ts). */
  auth: 'public' | 'admin';
  params?: z.ZodObject;
  query?: z.ZodObject;
  body?: { schema: z.ZodType; type: 'application/json' | 'multipart/form-data' };
  responses: Record<
    number,
    { description: string; schema?: z.ZodType; contentType?: string; headers?: Record<string, string> }
  >;
}

/** Declares an endpoint; the identity function, typed. */
export const endpoint = <const E extends Endpoint>(definition: E): E => definition;
