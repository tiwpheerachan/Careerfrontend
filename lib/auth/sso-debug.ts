/**
 * Seeing what /sso/verify actually answers, without writing it into a log.
 *
 * The reply carries a real person's name and email. On a developer's terminal
 * that is fine; in Render's log store it is employee data sitting somewhere it
 * was never meant to be, kept for as long as the logs are kept, readable by
 * anyone with dashboard access. So the useful question — WHICH fields arrive,
 * and are any of them ones this app does not know about — is answered without
 * printing the values that make it sensitive.
 *
 * Off unless SSO_DEBUG is set, so nothing is logged in normal operation:
 *
 *   SSO_DEBUG=shape  field names, types, sizes, and the values that identify
 *                    nobody (roles, app, iat). Safe to switch on in production
 *                    for one sign-in.
 *   SSO_DEBUG=full   the response verbatim, PII included. For a local machine
 *                    and a test account. Refuses to run in production.
 */

/**
 * The fields lib/auth/sso.ts declares in `Identity`.
 *
 * Anything outside this set is the interesting part of the output: it is the
 * central system sending something this app has never been told about, which
 * is exactly what somebody asking "what comes back?" is looking for.
 */
const PREFIX = '[sso][debug]';

const DECLARED = new Set(['sub', 'name', 'email', 'roles', 'permissions', 'app', 'iat']);

/**
 * The only fields whose values are printed.
 *
 * An allowlist, not a blocklist, and it is this way round because the
 * blocklist version shipped and leaked. It named sub, name and email, printed
 * everything else, and the first real sign-in on production put an id_token in
 * the log — a JWT whose payload is the signed-in person's name and email in
 * base64. Nothing had to go wrong for that to happen; the design simply
 * assumed the central system would never send a field it had not been told
 * about, which is the one assumption a "what is being sent?" tool cannot make.
 *
 * So: a value is printed only if it is known to identify nobody. Everything
 * else — declared or not — is reported by type and size, which is enough to
 * decide whether it belongs on this list.
 */
const SAFE_TO_PRINT = new Set(['roles', 'permissions', 'app', 'iat']);

function describe(key: string, value: unknown): string {
  if (value === null) return 'null';

  if (!SAFE_TO_PRINT.has(key)) {
    // Type and size, never the value. Enough to tell "sent and empty" from
    // "not sent at all", which is the distinction that matters when a name is
    // showing up blank on screen.
    if (Array.isArray(value)) return `array(${value.length}) (values withheld)`;
    if (typeof value === 'object') {
      return `object (${Object.keys(value as object).length} keys, values withheld)`;
    }
    return `${typeof value} (${String(value).length} chars, value withheld)`;
  }

  if (Array.isArray(value)) return `array(${value.length}) ${JSON.stringify(value)}`;
  if (typeof value === 'object') return `object ${JSON.stringify(value)}`;
  return `${typeof value} ${JSON.stringify(value)}`;
}

/** Only the two variables this reads, so a test can pass a plain object. */
interface DebugEnv {
  SSO_DEBUG?: string;
  NODE_ENV?: string;
}

/**
 * A line to log, or undefined when debugging is off or the mode is unusable.
 *
 * Returns rather than logs so the redaction can be tested without capturing
 * console output.
 */
export function describeVerifyResponse(raw: string, env: DebugEnv = process.env): string | undefined {
  const mode = env.SSO_DEBUG?.trim().toLowerCase();
  if (mode !== 'shape' && mode !== 'full') return undefined;

  if (mode === 'full') {
    // The one guard that matters. `full` is a foot-gun that a hurried
    // afternoon could leave switched on, so it is refused where the cost of
    // that is other people's data rather than your own terminal.
    if (env.NODE_ENV === 'production') {
      return '[sso][debug] SSO_DEBUG=full is refused in production. Use SSO_DEBUG=shape.';
    }
    return `${PREFIX} /sso/verify returned: ${raw}`;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return `${PREFIX} /sso/verify returned ${raw.length} bytes that are not JSON.`;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return `${PREFIX} /sso/verify returned ${Array.isArray(parsed) ? 'an array' : typeof parsed}, not an object.`;
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  const undeclared = entries.map(([key]) => key).filter((key) => !DECLARED.has(key));
  const missing = [...DECLARED].filter((key) => !entries.some(([k]) => k === key));

  // Every line carries the prefix, not just the first. Log viewers split on
  // newlines and then filter line by line, so a header-only prefix means
  // searching for "[sso][debug]" returns the summary and hides every field it
  // was summarising — which is the whole output.
  const line = (text: string) => `${PREFIX} ${text}`;

  return [
    line(`/sso/verify returned ${entries.length} fields ('+' = not in Identity):`),
    ...entries.map(([key, value]) => {
      const flag = DECLARED.has(key) ? ' ' : '+'; // '+' marks a field Identity does not declare
      return line(`  ${flag} ${key}: ${describe(key, value)}`);
    }),
    line(`  undeclared: ${undeclared.length ? undeclared.join(', ') : 'none'}`),
    line(`  not sent:   ${missing.length ? missing.join(', ') : 'none'}`),
  ].join('\n');
}
