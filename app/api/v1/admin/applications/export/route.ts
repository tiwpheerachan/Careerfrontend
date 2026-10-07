import { jobTitle } from '@/components/admin/jobs/job-utils';
import { adminExportApplications } from '@/lib/api/contracts';
import { asText, csvDateTime, toCsv } from '@/lib/api/csv';
import { handler, parseQuery } from '@/lib/api/http';
import { adminLocaleOfRequest, adminTranslator } from '@/lib/admin/server-i18n';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** The columns, in order; each one's heading is applications.export.columns.<key>. */
const COLUMNS = [
  'id',
  'createdAt',
  'stage',
  'jobCode',
  'jobTitle',
  'department',
  'level',
  'country',
  'firstName',
  'lastName',
  'email',
  'phone',
  'residenceCountry',
  'address',
  'visaRequired',
  'availableFrom',
  'websiteUrl',
  'sourceChannel',
] as const;

/**
 * GET /api/v1/admin/applications/export — every match as CSV, same filters as
 * the list. Written for the person downloading it, in the admin's language
 * (admin_locale cookie): the headings, the stage, yes/no and the job's title;
 * times in Bangkok (lib/api/csv.ts).
 */
export const GET = handler(async (request, { log }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'manage' });
  const query = parseQuery(request, adminExportApplications.query);
  const locale = adminLocaleOfRequest(request);
  const [rows, jobs] = await Promise.all([store().applications.exportRows(query), store().jobs.list()]);
  log.info({ actor: actor.email, rows: rows.length }, 'applications exported');

  const t = adminTranslator(locale, 'applications.export');
  const tStage = adminTranslator(locale, 'stage');
  const titles = new Map(jobs.map((job) => [job.id, jobTitle(job, locale)]));

  const csv = toCsv(
    COLUMNS.map((column) => t(`columns.${column}`)),
    rows.map((r) => [
      r.id,
      r.createdAt,
      tStage(r.stage),
      r.job.code,
      titles.get(r.job.id) ?? r.job.title,
      r.job.department,
      r.job.level,
      r.job.countryCode,
      r.firstName,
      r.lastName,
      r.email,
      asText(r.phone),
      r.residenceCountry,
      r.address,
      r.visaRequired ? t('yes') : t('no'),
      r.availableFrom,
      r.websiteUrl,
      r.sourceChannel,
    ]),
  );
  const day = csvDateTime(new Date()).slice(0, 10);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="applications-${day}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
});
