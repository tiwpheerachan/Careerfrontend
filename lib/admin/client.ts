/**
 * Calls /api/v1/admin/* from the admin's client components.
 *
 * Every mutation in the admin goes through the API (the same endpoints, the
 * same gate, the same validation the docs describe) and then refreshes the
 * server-rendered page. Errors come back as AdminApiError carrying the API's
 * `code`, `message` and field `issues` — shown in a toast or next to fields.
 */
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: Array<{ path: string; message: string }>;

  constructor(status: number, code: string, message: string, issues: Array<{ path: string; message: string }> = []) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

export async function adminFetch<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin${path}`, {
      ...rest,
      headers: { ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: 'no-store',
    });
  } catch {
    throw new AdminApiError(0, 'network', 'Could not reach the server.');
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error ?? {};
    throw new AdminApiError(response.status, error.code ?? 'error', error.message ?? response.statusText, error.issues);
  }
  return body as T;
}
