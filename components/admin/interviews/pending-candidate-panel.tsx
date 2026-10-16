'use client';

import { FileDown, Link2, Loader2, Phone, UserRoundSearch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAbilities } from '@/components/admin/shell/abilities';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { CandidatePicker, type PickedCandidate } from './candidate-picker';

export interface PendingPanelCandidate {
  id: string;
  name: string;
  phone: string | null;
  resumeName: string | null;
}

/**
 * On the page of a candidate HR added without an application: their phone and
 * résumé (HR's only), and linking them to their application or form once it
 * exists — the forms that look like them first (same name or phone), or any
 * other found by search. Linking moves every evaluation and invitation and
 * cannot be undone, so it is confirmed first.
 */
export function PendingCandidatePanel({
  candidate,
  suggestions,
}: {
  candidate: PendingPanelCandidate;
  suggestions: PickedCandidate[];
}) {
  const t = useTranslations('interviews.pending');
  const tk = useTranslations('interviews.form.kinds');
  const abilities = useAbilities();
  const router = useRouter();
  const [target, setTarget] = useState<PickedCandidate | null>(null);
  const [linking, setLinking] = useState(false);
  const canLink = abilities.applications.edit;

  const link = async () => {
    if (!target) return;
    setLinking(true);
    try {
      const { key } = await adminFetch<{ key: string }>(`/interview-candidates/${candidate.id}/link`, {
        method: 'POST',
        json: target.kind === 'application' ? { applicationId: target.id } : { applicationFormId: target.id },
      });
      toast.success(t('linked'));
      router.replace(`/admin/interviews/candidate/${encodeURIComponent(key)}`);
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : t('linkFailed'));
      setLinking(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <UserRoundSearch className="h-4 w-4 text-amber-600" /> {t('bannerTitle')}
      </h2>
      <p className="mt-1 text-xs text-gray-600">{t('bannerBody')}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {candidate.phone && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-gray-800">
            <Phone className="h-4 w-4 text-gray-500" /> {candidate.phone}
          </span>
        )}
        {candidate.resumeName && (
          <a
            href={`/api/v1/admin/interview-candidates/${candidate.id}/resume`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-800 hover:border-blue-300 hover:bg-blue-50"
          >
            <FileDown className="h-4 w-4 text-blue-600" /> {t('resumeOpen')}
          </a>
        )}
      </div>

      {canLink && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-xs font-bold text-gray-700">{t('suggestions')}</h3>
          {suggestions.length === 0 ? (
            <p className="mt-1 text-xs text-gray-500">{t('noSuggestions')}</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {suggestions.map((s) => (
                <li key={`${s.kind}:${s.id}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                      {s.name}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                        {tk(s.kind)}
                      </span>
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {[s.position, s.department, s.email].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTarget(s)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Link2 className="h-3.5 w-3.5" /> {t('link')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <CandidatePicker
              label={t('searchOther')}
              exclude={['pending']}
              onPick={setTarget}
              inputId="pc-link-search"
            />
          </div>
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(open) => !open && !linking && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('linkTitle')}</DialogTitle>
            <DialogDescription>
              {target && t('linkBody', { name: candidate.name, target: `${target.name} (${tk(target.kind)})` })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={linking}
              onClick={() => setTarget(null)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={linking}
              onClick={() => void link()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} {t('confirm')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
