import { handler, json } from '@/lib/api/http';
import { openapi } from '@/lib/api/openapi';
import { requireAdmin } from '@/lib/auth/admin';

/** GET /api/v1/openapi.json — this API, generated from its zod contracts. Behind the admin gate. */
export const GET = handler(async (request) => {
  await requireAdmin(request);
  return json(openapi());
});
