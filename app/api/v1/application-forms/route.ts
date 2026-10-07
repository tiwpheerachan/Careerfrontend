import { submitApplicationForm } from '@/lib/api/application-form';
import { handler, json } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

/** POST /api/v1/application-forms — the paper application form, filled in online. See lib/api/application-form.ts. */
export const POST = handler(async (request, { log }) => {
  return json(await submitApplicationForm(request, log), 201);
});
