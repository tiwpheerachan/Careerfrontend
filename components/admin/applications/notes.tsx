'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition, type FormEvent } from 'react';
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
} from '@/components/ui/alert-dialog';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { formatDateTime } from '@/lib/admin/format';
import type { AdminLocale } from '@/lib/i18n/admin';

interface Note {
  id: string;
  body: string;
  createdBy: string | null;
  createdAt: Date | string;
}

const issueOf = (error: unknown, field: string) =>
  error instanceof AdminApiError ? error.issues.find((i) => i.path === field)?.message : undefined;

/**
 * Internal notes as a history — add one, delete one — instead of the old
 * single note that each save overwrote.
 */
export function Notes({ applicationId, notes }: { applicationId: string; notes: Note[] }) {
  const t = useTranslations('applications.detail');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AdminLocale;
  const router = useRouter();
  const [body, setBody] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, startTransition] = useTransition();

  const onAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setAdding(true);
    setFieldError(undefined);
    try {
      await adminFetch(`/applications/${applicationId}/notes`, { method: 'POST', json: { body } });
      setBody('');
      toast.success(t('noteAdded'));
      startTransition(() => router.refresh());
    } catch (error) {
      const issue = issueOf(error, 'body');
      if (issue) setFieldError(issue);
      toast.error(t('noteFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
    } finally {
      setAdding(false);
    }
  };

  const onDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminFetch(`/applications/${applicationId}/notes/${toDelete.id}`, { method: 'DELETE' });
      setToDelete(null);
      toast.success(t('noteDeleted'));
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(t('noteDeleteFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <form onSubmit={onAdd}>
        <label htmlFor="note-body" className="sr-only">
          {t('notes')}
        </label>
        <textarea
          id="note-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setFieldError(undefined);
          }}
          maxLength={5000}
          aria-invalid={!!fieldError}
          placeholder={t('notePlaceholder')}
          className="min-h-[90px] w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-hidden placeholder:text-gray-400 focus:border-blue-600 aria-invalid:border-red-500"
        />
        {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
        <button
          type="submit"
          disabled={adding || !body.trim()}
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('addNote')}
        </button>
      </form>

      <div className={refreshing ? 'opacity-60 transition-opacity' : undefined}>
        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">{t('noNotes')}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="group rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <p className="text-sm break-words whitespace-pre-wrap text-gray-900">{note.body}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="min-w-0 text-xs text-gray-400">
                    <span className="break-all">{note.createdBy ?? t('bySystem')}</span> ·{' '}
                    {formatDateTime(note.createdAt, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setToDelete(note)}
                    aria-label={t('deleteNote')}
                    title={t('deleteNote')}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteNoteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteNoteBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          {toDelete && (
            <p className="line-clamp-3 rounded-lg bg-gray-50 px-3 py-2 text-sm whitespace-pre-wrap text-gray-700">
              {toDelete.body}
            </p>
          )}
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
    </>
  );
}
