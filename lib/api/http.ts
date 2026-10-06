import 'server-only';
import type { z } from 'zod';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnavailableError,
} from '@/lib/errors';
import { log, type Logger } from '@/lib/log';

/**
 * The HTTP edge: input in, JSON and status codes out.
 *
 * Everything below the route handlers deals in domain types and throws domain
 * errors; this is the only module that knows about status codes. Every error
 * leaves as
 *
 *   { "error": { "code": "not_found", "message": "…", "issues"?: [...] } }
 */

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    /** Only on a 400 from schema validation: which fields, and what is wrong with each. */
    issues?: Array<{ path: string; message: string }>;
  };
}

export function json<T>(body: T, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

function error(status: number, code: string, message: string, extra?: Partial<ErrorBody['error']>): Response {
  return json<ErrorBody>({ error: { code, message, ...extra } }, status);
}

/**
 * Maps a thrown error onto a response. Anything that is not a domain error is
 * logged with its stack and returned as an opaque 500 — a driver message can
 * carry connection details a client has no business seeing.
 */
export function failure(err: unknown, logger: Logger = log): Response {
  if (err instanceof BadRequestError) {
    return error(400, 'bad_request', err.message, err.issues ? { issues: err.issues } : undefined);
  }
  if (err instanceof UnauthorizedError) return error(401, 'unauthorized', err.message);
  if (err instanceof ForbiddenError) return error(403, 'forbidden', err.message);
  if (err instanceof NotFoundError) return error(404, 'not_found', err.message);
  if (err instanceof ConflictError) return error(409, 'conflict', err.message);
  if (err instanceof TooManyRequestsError) {
    return json<ErrorBody>({ error: { code: 'too_many_requests', message: err.message } }, 429, {
      'retry-after': String(err.retryAfter),
    });
  }
  if (err instanceof UnavailableError) return error(503, 'unavailable', err.message);

  logger.error({ err }, 'unhandled error');
  return error(500, 'internal', 'Something went wrong handling that request.');
}

/** The request id: the caller's (or Cloudflare's / Render's) if it sent one, else a new one. */
function requestId(request: Request | undefined): string {
  const incoming = request?.headers.get('x-request-id') ?? request?.headers.get('cf-ray');
  return incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
}

export interface HandlerContext {
  /** A logger carrying this request's id; every line it writes can be found by that id. */
  log: Logger;
  requestId: string;
}

/**
 * Wraps a route handler: one try/catch for every route, a request id echoed as
 * `x-request-id`, and one access log line per request.
 *
 *   export const GET = handler(async (request, { log }) => json(...));
 */
export function handler<P = unknown>(
  run: (request: Request, context: HandlerContext, route: P) => Promise<Response>,
): (request: Request, route: P) => Promise<Response> {
  return async (request, route) => {
    const id = requestId(request);
    const logger = log.child({ requestId: id });
    const started = performance.now();

    let response: Response;
    try {
      response = await run(request, { log: logger, requestId: id }, route);
    } catch (err) {
      response = failure(err, logger);
    }

    response.headers.set('x-request-id', id);
    logger.info(
      {
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
        ms: Math.round(performance.now() - started),
      },
      'request',
    );
    return response;
  };
}

/** Turns zod issues into the `issues` list of a 400. */
function issuesOf(zodError: z.ZodError): Array<{ path: string; message: string }> {
  return zodError.issues.map((issue) => ({ path: issue.path.join('.') || '(body)', message: issue.message }));
}

/** Parses and validates a JSON body against the endpoint's schema. Malformed or invalid → 400. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new BadRequestError('Request body must be valid JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError('The request body is not valid.', issuesOf(parsed.error));
  return parsed.data;
}

/**
 * Validates the path parameters. A path names a resource, so one that does not
 * fit (a malformed id, a code with spaces) is a 404 — there is no such thing —
 * rather than a 400.
 */
export async function parseParams<S extends z.ZodType>(
  params: Promise<Record<string, string | string[]>>,
  schema: S,
): Promise<z.infer<S>> {
  const raw = await params;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new NotFoundError('resource', Object.values(raw).join('/'));
  return parsed.data;
}

/** The route context Next passes a dynamic route handler. */
export type RouteParams<K extends string> = { params: Promise<Record<K, string>> };

/** Validates the query string against the endpoint's schema. Invalid → 400. */
export function parseQuery<S extends z.ZodType>(request: Request, schema: S): z.infer<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) throw new BadRequestError('The query string is not valid.', issuesOf(parsed.error));
  return parsed.data;
}
