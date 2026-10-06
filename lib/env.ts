import { z } from 'zod';

/**
 * Every server environment variable, checked once.
 *
 * instrumentation.ts calls serverEnv() before the server answers anything, so
 * a missing or malformed variable stops the process at startup with a list of
 * what is wrong — rather than surfacing as a 500 on the first request that
 * happens to need it.
 *
 * Optional means "the feature is off without it", never "it has a guessed
 * default": SENTRY_DSN empty sends nothing anywhere.
 */

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// or postgresql:// URL');

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Supabase transaction pooler (:6543, ?pgbouncer=true) in production; the
  // local container in development.
  DATABASE_URL: postgresUrl,
  // Session pooler (:5432). Only migrations use it; the app never does.
  DIRECT_URL: optional(postgresUrl),

  NEXT_PUBLIC_SUPABASE_URL: optional(z.url()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optional(z.string().min(1)),

  // Uploaded files (résumés). `local` = a folder on this machine, for
  // development; `supabase` = a PRIVATE Supabase Storage bucket, required in
  // production. Development never touches Supabase, like the database.
  STORAGE_DRIVER: z.enum(['local', 'supabase']).default('local'),
  LOCAL_STORAGE_DIR: z.string().min(1).default('.storage'),
  STORAGE_BUCKET: z.string().min(1).default('applications'),
  // Server only: the secret key (sb_secret_… or the legacy service_role JWT).
  // Never NEXT_PUBLIC_ — it can read every résumé.
  SUPABASE_SERVICE_ROLE_KEY: optional(z.string().min(20)),

  // Cloudflare Turnstile on the application form. Both empty = off.
  TURNSTILE_SECRET_KEY: optional(z.string().min(1)),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optional(z.string().min(1)),

  // The old Google Sheet (Apps Script) that gets a row per application.
  // Empty = off. Sent after the application is saved; never fails it.
  APPLY_SHEET_WEBHOOK_URL: optional(z.url()),
  APPLY_SHEET_API_KEY: optional(z.string().min(1)),

  // Where the visitor's IP is (for the application rate limit). Behind
  // Cloudflare + Render: X-Forwarded-For, counted HOPS entries from the right
  // — re-measure on the real deployment (see render.yaml). Unset = no IP, and
  // the per-IP limit is skipped (with a warning) rather than shared by all.
  TRUST_PROXY_HEADER: optional(z.string().min(1)),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(10).default(1),

  // Error reporting. Empty = Sentry is never initialised and nothing is sent.
  SENTRY_DSN: optional(z.url()),
  SENTRY_ENVIRONMENT: optional(z.string().min(1)),

  SHD_ALLOW_PRODUCTION: optional(z.literal('1')),
});

/** Rules between variables, which one field's schema cannot say. */
const checkedSchema = serverSchema.superRefine((env, ctx) => {
  const problem = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });

  if (env.NODE_ENV === 'production' && env.STORAGE_DRIVER !== 'supabase') {
    problem('STORAGE_DRIVER', 'must be "supabase" in production — local disk does not survive a Render deploy');
  }
  if (env.STORAGE_DRIVER === 'supabase') {
    if (!env.NEXT_PUBLIC_SUPABASE_URL) problem('NEXT_PUBLIC_SUPABASE_URL', 'is required when STORAGE_DRIVER=supabase');
    if (!env.SUPABASE_SERVICE_ROLE_KEY)
      problem('SUPABASE_SERVICE_ROLE_KEY', 'is required when STORAGE_DRIVER=supabase');
  }
  if (Boolean(env.TURNSTILE_SECRET_KEY) !== Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
    problem('TURNSTILE_SECRET_KEY', 'set both TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY, or neither');
  }
  if (env.APPLY_SHEET_WEBHOOK_URL && !env.APPLY_SHEET_API_KEY) {
    problem('APPLY_SHEET_API_KEY', 'is required when APPLY_SHEET_WEBHOOK_URL is set');
  }
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

/** The validated server environment. Throws, listing every problem, if it is not valid. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = checkedSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(
      `Invalid environment — the server will not start until these are fixed:\n${problems.join('\n')}\n` +
        'See .env.example (production) and .env.development.example (local).',
    );
  }
  cached = parsed.data;
  return cached;
}

/** Forgets the validated environment, so the next serverEnv() reads process.env again. Tests only. */
export function resetServerEnv(): void {
  cached = undefined;
}

/**
 * The startup check: valid, or the process exits.
 *
 * Throwing is not enough. Next catches an error from the instrumentation hook,
 * keeps listening and answers every request with a 500 — a server that looks
 * up to a process manager. Exiting makes the deploy fail where it is visible.
 */
export function serverEnvOrExit(): ServerEnv {
  try {
    return serverEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
