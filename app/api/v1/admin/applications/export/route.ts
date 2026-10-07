import { adminExportApplications } from '@/lib/api/contracts';
import { toCsv } from '@/lib/api/csv';
import { handler, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

const HEADER = [
  'id',
  'created_at',
  'stage',
  'job_code',
  'job_title',
  'department',
  'level',
  'country',
  'first_name',
  'last_name',
  'email',
  'phone',
  'residence_country',
  'address',
  'visa_required',
  'available_from',
  'website_url',
  'source_channel',
];

/** GET /api/v1/admin/applications/export — every match as CSV, same filters as the list. */
export const GET = handler(async (request, { log }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'manage' });
  const query = parseQuery(request, adminExportApplications.query);
  const rows = await store().applications.exportRows(query);
  log.info({ actor: actor.email, rows: rows.length }, 'applications exported');

  const csv = toCsv(
    HEADER,
    rows.map((r) => [
      r.id,
      r.createdAt,
      r.stage,
      r.job.code,
      r.job.title,
      r.job.department,
      r.job.level,
      r.job.countryCode,
      r.firstName,
      r.lastName,
      r.email,
      r.phone,
      r.residenceCountry,
      r.address,
      r.visaRequired ? 'yes' : 'no',
      r.availableFrom,
      r.websiteUrl,
      r.sourceChannel,
    ]),
  );
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="applications-${day}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
});
