import 'server-only';
import { adminActorOf } from '@/lib/auth/admin';
import type { Logger } from '@/lib/log';
import { store } from '@/lib/store';

const ADMIN = '/api/v1/admin/';
const ACTIONS: Record<string, 'create' | 'update' | 'delete' | 'download'> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
  GET: 'download',
};
/** The GETs that take personal data out: a resume file, a PDF, the CSV export. */
const DOWNLOAD = /\/(files\/[^/]+|pdf|export)$/;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const BODY_LIMIT = 16_000;

/**
 * The admin audit trail (admin_audit_logs): every admin API call that creates,
 * changes or deletes, and every download of personal data — who (as
 * requireAdmin found them), what, which record, the outcome, and the JSON that
 * was sent. Started before the route runs (the body is read from a clone),
 * finished with its response. Not signed in = nothing done, nothing written.
 * A failed write is logged, never the request's failure.
 */
export function auditStart(request: Request) {
  const url = new URL(request.url);
  const action = ACTIONS[request.method];
  if (!url.pathname.startsWith(ADMIN) || !action) return null;
  if (action === 'download' && !DOWNLOAD.test(url.pathname)) return null;
  const body = request.headers.get('content-type')?.includes('application/json')
    ? request
        .clone()
        .text()
        .catch(() => null)
    : null;

  return async (response: Response, logger: Logger, requestId: string) => {
    const actor = adminActorOf(request);
    if (!actor) return;
    try {
      const raw = await body;
      await store().adminAuditLogs.record({
        actorEmail: actor.email,
        actorName: actor.name || null,
        action,
        method: request.method,
        path: url.pathname + url.search,
        resource: url.pathname.slice(ADMIN.length).split('/')[0]!,
        targetId: UUID.exec(url.pathname)?.[0] ?? null,
        status: response.status,
        body: raw ? bodyOf(raw) : null,
        ip:
          request.headers.get('cf-connecting-ip') ??
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          null,
        requestId,
      });
    } catch (err) {
      logger.error({ err }, 'admin audit log not written');
    }
  };
}

function bodyOf(raw: string): unknown {
  if (raw.length > BODY_LIMIT) return { truncated: true, bytes: raw.length };
  try {
    return JSON.parse(raw);
  } catch {
    return { unparsed: true };
  }
}
