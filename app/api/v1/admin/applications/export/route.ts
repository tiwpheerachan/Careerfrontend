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
 * times in Bangkok (lib/api/csv.ts). Streamed batch by batch; a failure before
 * the first one is still a proper error response, one after it breaks the
 * download off.
 */
export const GET = handler(async (request, { log }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'manage' });
  const query = parseQuery(request, adminExportApplications.query);
  const locale = adminLocaleOfRequest(request);
  const jobs = await store().jobs.titles();

  const t = adminTranslator(locale, 'applications.export');
  const tStage = adminTranslator(locale, 'stage');
  // A deleted job's title has always been the Thai one, else English, else Chinese.
  const titleOf = ({ id, code }: { id: string; code: string }) => {
    const job = jobs.get(id);
    if (!job || job.deleted) return job?.titles.th ?? job?.titles.en ?? job?.titles.zh;
    const translations = Object.fromEntries(Object.entries(job.titles).map(([l, title]) => [l, { title }]));
    return jobTitle({ code, translations }, locale);
  };

  async function* csv() {
    let count = 0;
    yield toCsv(
      COLUMNS.map((column) => t(`columns.${column}`)),
      [],
    );
    for await (const rows of store().applications.exportRows(query)) {
      count += rows.length;
      // Rows only: without toCsv's byte-order mark and (empty) heading line.
      yield toCsv(
        [],
        rows.map((r) => [
          r.id,
          r.createdAt,
          tStage(r.stage),
          r.job.code,
          titleOf(r.job),
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
      ).slice(3);
    }
    log.info({ actor: actor.email, rows: count }, 'applications exported');
  }

  const chunks = csv();
  const first = [await chunks.next(), await chunks.next()];
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = first.shift() ?? (await chunks.next());
      if (done) controller.close();
      else controller.enqueue(encoder.encode(value));
    },
    async cancel() {
      await chunks.return();
    },
  });
  const day = csvDateTime(new Date()).slice(0, 10);
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="applications-${day}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
});
