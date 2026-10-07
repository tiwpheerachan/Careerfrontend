import { renderApplicationFormPdf } from '@/lib/application-form/pdf';
import { adminApplicationFormPdf } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { allows } from '@/lib/auth/permissions';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/application-forms/{id}/pdf — the form printed onto its
 * company's blank form. The sensitive fields only for applications.manage.
 */
export const GET = handler<RouteParams<'id'>>(async (request, { log }, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { id } = await parseParams(params, adminApplicationFormPdf.params);
  const form = await store().applicationForms.get(id);
  const withSensitive = allows(actor.permissions, 'applications', 'manage');

  const pdf = await renderApplicationFormPdf({
    letterhead: form.letterhead,
    position: form.position,
    answers: form.answers,
    sensitive: withSensitive ? form.sensitive : null,
    submittedAt: form.createdAt,
  });
  log.info({ applicationFormId: id, withSensitive }, 'application form PDF');

  const name = `ใบสมัครงาน-${form.nameTh}.pdf`.replace(/[\\/:*?"<>|]/g, '');
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      // inline: opens in the browser's viewer, from where it prints or saves under this name.
      'content-disposition': `inline; filename="application-form.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'private, no-store',
    },
  });
});
