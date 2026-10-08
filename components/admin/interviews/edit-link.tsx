'use client';

import { Check, Copy, Link2, Loader2, PencilLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminFetch } from '@/lib/admin/client';

/**
 * "Make an edit link" for one evaluation (POST …/{id}/edit-link): the only way
 * an evaluation changes. The link is for its evaluator alone; it then shows
 * among the candidate's links, where it can be switched off.
 */
export function EditLink({ evaluationId, who }: { evaluationId: string; who: string }) {
  const t = useTranslations('interviews.editLink');
  const ti = useTranslations('interviews.invite');
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      const { invitation } = await adminFetch<{ invitation: { link: string } }>(
        `/interview-evaluations/${evaluationId}/edit-link`,
        { method: 'POST' },
      );
      setLink(invitation.link);
      router.refresh();
    } catch {
      toast.error(t('createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(ti('copied'));
    } catch {
      toast.error(ti('copyFailed'));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void create()}
        disabled={creating}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PencilLine className="h-3.5 w-3.5" />}
        {t('create')}
      </button>

      <Dialog open={link !== null} onOpenChange={(open) => !open && (setLink(null), setCopied(false))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('madeTitle')}</DialogTitle>
            <DialogDescription>{t('madeBody', { who })}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
            <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              readOnly
              value={link ?? ''}
              aria-label={t('linkLabel')}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 bg-transparent font-mono text-xs text-gray-800 outline-hidden"
            />
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {ti('copyLink')}
            </button>
          </div>
          <p className="text-xs text-gray-500">{t('rules')}</p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => (setLink(null), setCopied(false))}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {ti('done')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
