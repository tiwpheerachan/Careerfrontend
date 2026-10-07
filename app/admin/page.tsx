import { redirect } from 'next/navigation';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';

/** /admin → the overview, as the old admin did — or the first part this person may open. */
export default async function AdminIndex() {
  const can = abilitiesOf(await requireAdminPage());
  if (can.applications.view) redirect('/admin/dashboard');
  if (can.jobs.view) redirect('/admin/jobs');
  redirect('/admin/content');
}
