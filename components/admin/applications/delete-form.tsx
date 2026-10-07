'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAbilities } from '@/components/admin/shell/abilities';
import { AdminApiError, adminFetch } from '@/lib/admin/client';

/** Delete (soft) one application form, behind a confirm. Manage only. */
export function DeleteApplicationForm({ id, name }: { id: string; name: string }) {
  const t = useTranslations('applications.forms');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const can = useAbilities();

  if (!can.applications.manage) return null;

  const onDelete = async () => {
    setDeleting(true);
    try {
      await adminFetch(`/application-forms/${id}`, { method: 'DELETE' });
      toast.success(t('deleted'));
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(t('deleteFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={t('deleteFor', { name })}
          title={tCommon('delete')}
          className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteTitle', { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteBody')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault();
              void onDelete();
            }}
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {tCommon('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
