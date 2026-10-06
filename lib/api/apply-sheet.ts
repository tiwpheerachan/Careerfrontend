import { serverEnv } from '@/lib/env';
import type { Logger } from '@/lib/log';
import type { ApplicationInput } from '@/lib/repositories/applications';

/**
 * One row per application in HR's Google Sheet, through the same Apps Script
 * webhook the old site used. Off unless APPLY_SHEET_WEBHOOK_URL is set.
 *
 * Runs after the response has been sent (next/server `after`): it never slows
 * the form down and never fails an application that is already saved. No file
 * links are sent — résumés are private now; HR opens them in the admin.
 */
export async function pushToApplySheet(
  application: { id: string; jobCode: string; jobTitle: string | null; input: ApplicationInput },
  log: Logger,
): Promise<void> {
  const env = serverEnv();
  if (!env.APPLY_SHEET_WEBHOOK_URL || !env.APPLY_SHEET_API_KEY) return;

  const { input } = application;
  const url = new URL(env.APPLY_SHEET_WEBHOOK_URL);
  url.searchParams.set('key', env.APPLY_SHEET_API_KEY);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        submitted_at: new Date().toISOString(),
        application_id: application.id,
        job_id: application.jobCode,
        job_title: application.jobTitle,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        residence_country: input.residenceCountry,
        address: input.address,
        visa_required: input.visaRequired,
        available_start_date: input.availableFrom,
        website_url: input.websiteUrl,
        source_channel: input.sourceChannel,
        skills_json: input.skills,
        education_json: input.educations,
        experience_json: input.experiences,
        attachments_count: input.files.length,
      }),
    });
    if (!response.ok) log.warn({ status: response.status, applicationId: application.id }, 'apply sheet: not accepted');
  } catch (err) {
    // The application is saved either way; only the sheet row is missing.
    log.warn({ err, applicationId: application.id }, 'apply sheet: push failed');
  }
}
