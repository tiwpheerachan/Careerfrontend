import { notFound, redirect } from 'next/navigation';
import { store } from '@/lib/store';
import { requireAdminPage } from '@/lib/auth/admin';

/**
 * The old admin's /admin/jobs/:id/edit — the editor now lives at
 * /admin/jobs/:id. Old bookmarks carry the job code (the old job_id) rather
 * than the uuid, so a code is looked up too.
 */
export default async function OldEditUrl({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage({ resource: 'jobs', level: 'view' });
  const id = decodeURIComponent((await params).id);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) redirect(`/admin/jobs/${id}`);
  const code = id.trim().toUpperCase();
  const job = (await store().jobs.list({ q: code })).find((j) => j.code === code);
  if (!job) notFound();
  redirect(`/admin/jobs/${job.id}`);
}
