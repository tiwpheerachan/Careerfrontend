import 'server-only';
import { z } from 'zod';
import {
  BadRequestError,
  ConflictError,
  GoneError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnavailableError,
} from '@/lib/errors';
import { log, type Logger } from '@/lib/log';
import { auditStart } from './audit';

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
  if (err instanceof GoneError) return error(410, 'gone', err.message);
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
    const audit = auditStart(request);

    let response: Response;
    held.by.set(request, 0);
    try {
      response = await run(request, { log: logger, requestId: id }, route);
    } catch (err) {
      response = failure(err, logger);
    } finally {
      releaseBody(request);
    }

    response.headers.set('x-request-id', id);
    await audit?.(response, logger, id);
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

/**
 * The language validation messages are written in: the admin's chosen
 * language (admin_locale cookie) on /api/v1/admin, otherwise the `locale` the
 * request names (?locale= or the form field), else English. Messages written
 * into a schema itself stay as written.
 */
const LOCALE_ERRORS = {
  th: z.locales.th().localeError,
  zh: z.locales.zhCN().localeError,
  en: z.locales.en().localeError,
} as const;

export function validationLanguage(request: Request, declared?: unknown): keyof typeof LOCALE_ERRORS {
  const known = (value: unknown) => (value === 'th' || value === 'zh' || value === 'en' ? value : undefined);
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/v1/admin')) {
    const cookie = /(?:^|;\s*)admin_locale=(\w+)/.exec(request.headers.get('cookie') ?? '')?.[1];
    return cookie === 'en' || cookie === 'zh' ? cookie : 'th';
  }
  return known(declared) ?? known(url.searchParams.get('locale')) ?? 'en';
}

export const errorMapFor = (language: keyof typeof LOCALE_ERRORS) => LOCALE_ERRORS[language];

/** Turns zod issues into the `issues` list of a 400. */
function issuesOf(zodError: z.ZodError): Array<{ path: string; message: string }> {
  return zodError.issues.map((issue) => ({ path: issue.path.join('.') || '(body)', message: issue.message }));
}

/** The largest JSON body any endpoint takes. The biggest real one (a full application form) is a few KB. */
export const MAX_JSON_BYTES = 1024 * 1024;

/** Upload bytes held by all requests together. One request alone may pass it, up to its own limit. */
const BODY_BUDGET = 40 * 1024 * 1024;

/** Once per process (Symbol.for on globalThis), not once per bundle. */
const HELD = Symbol.for('shd-careers.heldBodies');
const held: { total: number; by: WeakMap<Request, number> } = ((
  globalThis as { [HELD]?: { total: number; by: WeakMap<Request, number> } }
)[HELD] ??= { total: 0, by: new WeakMap() });

/**
 * A body is held until its request is answered, not just while it arrives:
 * handler() starts the count and ends it. A chunk that arrives after that, or
 * a request outside handler(), is not counted — nothing would ever give it back.
 */
function releaseBody(request: Request): void {
  held.total -= held.by.get(request) ?? 0;
  held.by.delete(request);
}

/**
 * The body as a stream that fails once it passes `max`. Counted as it arrives:
 * a chunked request has no content-length to check, and request.json() or
 * request.formData() would buffer whatever is sent — a few 500 MB posts are
 * enough to take the instance down. So are two of 60 MB, each within its
 * limit: past BODY_BUDGET in all, a request is told to try again (503). By
 * what has arrived, not what was declared: a slow or idle upload blocks nobody.
 */
function limited(request: Request, max: number, message: string) {
  if (Number(request.headers.get('content-length') ?? 0) > max) throw new BadRequestError(message);
  let size = 0;
  const state: { error?: Error } = {};
  const refuse = (error: Error) => {
    state.error = error;
    throw error;
  };
  const stream = request.body?.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > max) refuse(new BadRequestError(message));
        const before = held.by.get(request);
        if (before === undefined) return controller.enqueue(chunk);
        const own = before + chunk.byteLength;
        const total = held.total + chunk.byteLength;
        if (total > BODY_BUDGET && total > own) {
          refuse(new UnavailableError('Too many uploads at the moment. Please try again in a minute.'));
        }
        held.by.set(request, own);
        held.total = total;
        controller.enqueue(chunk);
      },
    }),
  );
  return { body: new Response(stream ?? null, { headers: bodyHeaders(request) }), state };
}

const bodyHeaders = (request: Request) => ({ 'content-type': request.headers.get('content-type') ?? '' });

/** The body's bytes, refused once they pass `max`. */
export async function readBody(request: Request, max: number, message = 'The request body is too large.') {
  const { body, state } = limited(request, max, message);
  try {
    return Buffer.from(await body.arrayBuffer());
  } catch (err) {
    throw state.error ?? err;
  }
}

/** A multipart body, capped like readBody. Unreadable → 400 with `invalid`. */
export async function readFormData(request: Request, max: number, tooLarge: string, invalid: string) {
  const { body, state } = limited(request, max, tooLarge);
  try {
    return await body.formData();
  } catch {
    throw state.error ?? new BadRequestError(invalid);
  }
}

/** Parses and validates a JSON body against the endpoint's schema. Too large, malformed or invalid → 400. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const bytes = await readBody(request, MAX_JSON_BYTES);
  let raw: unknown;
  try {
    raw = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new BadRequestError('Request body must be valid JSON.');
  }
  return parseValue(request, schema, raw);
}

/** Validates a body already read (a JSON part of a multipart form), as parseBody does. */
export function parseValue<S extends z.ZodType>(request: Request, schema: S, raw: unknown): z.infer<S> {
  const parsed = schema.safeParse(raw, { error: errorMapFor(validationLanguage(request)) });
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
  const parsed = schema.safeParse(params, { error: errorMapFor(validationLanguage(request)) });
  if (!parsed.success) throw new BadRequestError('The query string is not valid.', issuesOf(parsed.error));
  return parsed.data;
}
