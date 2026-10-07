/**
 * Domain errors. Repositories and guards throw these; lib/api/http.ts is the
 * one place that turns them into status codes:
 *
 *   BadRequestError        400   the input is wrong
 *   UnauthorizedError      401   no usable session
 *   ForbiddenError         403   known caller, not allowed (never an empty 200)
 *   NotFoundError          404
 *   ConflictError          409   unique violation, state clash
 *   GoneError              410   it existed, and no longer works (an expired link)
 *   TooManyRequestsError   429   + Retry-After
 *   UnavailableError       503   a dependency (SSO, storage) is down or unconfigured
 *
 * `instanceof` is by name, so it holds across the several copies of this
 * module Next bundles (one per route) — the bug shd_onelink found the hard way.
 */
function named(value: unknown, name: string): boolean {
  return value instanceof Error && value.name === name;
}

export class BadRequestError extends Error {
  static [Symbol.hasInstance](value: unknown): value is BadRequestError {
    return named(value, 'BadRequestError');
  }

  /** Field-level problems, when the input was validated against a schema. */
  readonly issues?: Array<{ path: string; message: string }>;

  constructor(message: string, issues?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = 'BadRequestError';
    this.issues = issues;
  }
}

export class UnauthorizedError extends Error {
  static [Symbol.hasInstance](value: unknown): value is UnauthorizedError {
    return named(value, 'UnauthorizedError');
  }

  constructor(message = 'Sign in to use this endpoint.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  static [Symbol.hasInstance](value: unknown): value is ForbiddenError {
    return named(value, 'ForbiddenError');
  }

  constructor(message = 'You do not have permission to do this.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  static [Symbol.hasInstance](value: unknown): value is NotFoundError {
    return named(value, 'NotFoundError');
  }

  readonly kind: string;
  readonly identifier: string;

  constructor(kind: string, identifier: string) {
    super(`No ${kind} found with id "${identifier}".`);
    this.name = 'NotFoundError';
    this.kind = kind;
    this.identifier = identifier;
  }
}

export class ConflictError extends Error {
  static [Symbol.hasInstance](value: unknown): value is ConflictError {
    return named(value, 'ConflictError');
  }

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class GoneError extends Error {
  static [Symbol.hasInstance](value: unknown): value is GoneError {
    return named(value, 'GoneError');
  }

  constructor(message: string) {
    super(message);
    this.name = 'GoneError';
  }
}

export class TooManyRequestsError extends Error {
  static [Symbol.hasInstance](value: unknown): value is TooManyRequestsError {
    return named(value, 'TooManyRequestsError');
  }

  /** Seconds until the window turns over; sent as Retry-After. */
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super('Too many requests. Slow down and try again shortly.');
    this.name = 'TooManyRequestsError';
    this.retryAfter = retryAfter;
  }
}

export class UnavailableError extends Error {
  static [Symbol.hasInstance](value: unknown): value is UnavailableError {
    return named(value, 'UnavailableError');
  }

  constructor(message: string) {
    super(message);
    this.name = 'UnavailableError';
  }
}

/** Postgres SQLSTATEs translated rather than let through as a 500. */
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

/**
 * The driver's SQLSTATE. Drizzle wraps driver failures and puts the postgres.js
 * error on `cause`, so walk the chain; accept only a five-character code so an
 * unrelated `code` (ECONNREFUSED) is never mistaken for one.
 */
function sqlState(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current === 'object' && current !== null && 'code' in current) {
      const code = (current as { code: unknown }).code;
      if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Translates a driver error into a domain error, or rethrows it untouched. */
export function translatePgError(
  error: unknown,
  options: { conflict?: string; missing?: { kind: string; id: string } },
): never {
  const state = sqlState(error);
  if (state === UNIQUE_VIOLATION && options.conflict) throw new ConflictError(options.conflict);
  if (state === FOREIGN_KEY_VIOLATION && options.missing) {
    throw new NotFoundError(options.missing.kind, options.missing.id);
  }
  throw error;
}
