'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { adminFetch, AdminApiError } from '@/lib/admin/client';

export interface DeletableJob {
  id: string;
  code: string;
  title: string;
  applicantCount: number;
}

/**
 * "Delete this job?" — the old window.confirm(), as a dialog. Soft delete
 * (DELETE /api/v1/admin/jobs/{id}): the job leaves the site and the list, its
 * applicants stay. Used by the list's row menu and the editor's header.
 */
export function DeleteJobDialog({
  job,
  open,
  onOpenChange,
  onDeleted,
}: {
  job: DeletableJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (job: DeletableJob) => void;
}) {
  const t = useTranslations('jobs.delete');
  const common = useTranslations('common');
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!job) return;
    setBusy(true);
    try {
      await adminFetch(`/jobs/${job.id}`, { method: 'DELETE' });
      toast.success(t('done', { title: job.title }));
      onOpenChange(false);
      onDeleted(job);
    } catch (error) {
      toast.error(t('failed'), { description: error instanceof AdminApiError ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-50 text-red-600">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle className="font-bold text-gray-900">{t('title')}</AlertDialogTitle>
          {job && (
            <AlertDialogDescription asChild>
              <div className="space-y-1.5">
                <p>{t('body', { title: job.title, code: job.code })}</p>
                <p className="font-medium text-gray-700">{t('applicantsKept', { count: job.applicantCount })}</p>
              </div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{common('cancel')}</AlertDialogCancel>
          {/* A plain button, not AlertDialogAction: the dialog stays open while the request runs. */}
          <Button
            variant="destructive"
            onClick={remove}
            disabled={busy}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {busy ? t('deleting') : t('confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
