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
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { useAbilities } from '@/components/admin/shell/abilities';

/** Delete (soft) behind a confirm, then back to the list it came from. */
export function DeleteApplication({ id, name, backHref }: { id: string; name: string; backHref: string }) {
  const t = useTranslations('applications.detail');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const can = useAbilities();

  const onDelete = async () => {
    setDeleting(true);
    try {
      await adminFetch(`/applications/${id}`, { method: 'DELETE' });
      toast.success(t('deleted'));
      setOpen(false);
      router.push(backHref);
      router.refresh();
    } catch (error) {
      toast.error(t('deleteFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
      setDeleting(false);
    }
  };

  if (!can.applications.manage) return null;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          {t('deleteApplication')}
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
