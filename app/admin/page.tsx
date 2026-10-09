import { redirect } from 'next/navigation';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';

/** /admin (where login lands) → the interview evaluations — or the first part this person may open. */
export default async function AdminIndex() {
  const can = abilitiesOf(await requireAdminPage());
  if (can.applications.view) redirect('/admin/interviews');
  if (can.jobs.view) redirect('/admin/jobs');
  redirect('/admin/content');
}
