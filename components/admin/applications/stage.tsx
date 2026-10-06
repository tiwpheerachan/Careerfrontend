'use client';

import { ArrowRight, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, useContext, useState, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { STAGE_TONE, ToneBadge } from '@/components/admin/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { formatDateTime } from '@/lib/admin/format';
import { APPLICATION_STAGES } from '@/lib/constants';
import type { ApplicationStage } from '@/lib/constants-types';
import type { AdminLocale } from '@/lib/i18n/admin';
import { cn } from '@/lib/utils';

type When = Date | string;

/** The part of an application that a stage change touches. */
export interface StageState {
  stage: ApplicationStage;
  stageChangedAt: When | null;
  stageHistory: Array<{
    fromStage: ApplicationStage | null;
    toStage: ApplicationStage;
    changedBy: string | null;
    at: When;
  }>;
}

const StageContext = createContext<{ state: StageState; setState: (s: StageState) => void } | null>(null);

function useStage() {
  const value = useContext(StageContext);
  if (!value) throw new Error('useStage outside <StageProvider>');
  return value;
}

/**
 * Holds the stage, so the header badge, the stage panel and the history all
 * change together the moment the API answers (the old page left the header
 * on the previous stage until a reload). A fresh server render replaces it.
 */
export function StageProvider({ initial, children }: { initial: StageState; children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setState(initial);
  }
  return <StageContext.Provider value={{ state, setState }}>{children}</StageContext.Provider>;
}

export function StageBadge() {
  const t = useTranslations('stage');
  const { state } = useStage();
  return <ToneBadge tone={STAGE_TONE[state.stage]}>{t(state.stage)}</ToneBadge>;
}

/** Stage select + save → PATCH …/stage; the answer is the application as it now is. */
export function StagePanel({ applicationId }: { applicationId: string }) {
  const t = useTranslations('applications.detail');
  const tStage = useTranslations('stage');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AdminLocale;
  const router = useRouter();
  const { state, setState } = useStage();
  const [draft, setDraft] = useState<ApplicationStage>(state.stage);
  const [shownStage, setShownStage] = useState(state.stage);
  if (state.stage !== shownStage) {
    setShownStage(state.stage);
    setDraft(state.stage);
  }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const onSave = async () => {
    if (draft === state.stage) return;
    setSaving(true);
    setSaved(false);
    try {
      const { application } = await adminFetch<{ application: StageState }>(`/applications/${applicationId}/stage`, {
        method: 'PATCH',
        json: { stage: draft },
      });
      setState({
        stage: application.stage,
        stageChangedAt: application.stageChangedAt,
        stageHistory: application.stageHistory,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success(t('stageSaved', { stage: tStage(application.stage) }));
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(t('stageFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label htmlFor="stage-select" className="mb-1 block text-sm font-medium text-gray-800">
        {t('stage')}
      </label>
      <Select value={draft} onValueChange={(v) => setDraft(v as ApplicationStage)} disabled={saving}>
        <SelectTrigger
          id="stage-select"
          className="h-auto! w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {APPLICATION_STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              <span className={cn('h-2 w-2 rounded-full', DOT[s])} aria-hidden />
              {tStage(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={onSave}
        disabled={saving || draft === state.stage}
        className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {tCommon('saving')}
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> {tCommon('saved')}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" /> {tCommon('save')}
          </>
        )}
      </button>
      {state.stageChangedAt && (
        <p className="mt-2 text-center text-xs text-gray-500">
          {t('lastUpdated', { date: formatDateTime(state.stageChangedAt, locale) })}
        </p>
      )}
    </>
  );
}

const DOT: Record<ApplicationStage, string> = {
  NEW: 'bg-blue-500',
  REVIEWING: 'bg-amber-500',
  SHORTLISTED: 'bg-violet-500',
  REJECTED: 'bg-red-500',
  HIRED: 'bg-emerald-500',
};

/** Every move between stages, newest first: from → to, who, when. */
export function StageHistory() {
  const t = useTranslations('applications.detail');
  const tStage = useTranslations('stage');
  const locale = useLocale() as AdminLocale;
  const { state } = useStage();
  const entries = [...state.stageHistory].reverse();

  return (
    <ol className="relative space-y-4">
      {entries.map((h, i) => {
        const who = h.changedBy ?? (h.fromStage === null ? t('byApplicant') : t('bySystem'));
        return (
          <li key={`${String(h.at)}-${i}`} className="relative flex gap-3">
            {i < entries.length - 1 && (
              <span className="absolute top-4 bottom-[-1rem] left-[5px] w-px bg-gray-200" aria-hidden />
            )}
            <span
              className={cn(
                'relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-white',
                DOT[h.toStage],
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                {h.fromStage === null ? (
                  <>
                    <span className="font-medium text-gray-900">{t('received')}</span>
                    <ToneBadge tone={STAGE_TONE[h.toStage]}>{tStage(h.toStage)}</ToneBadge>
                  </>
                ) : (
                  <>
                    <ToneBadge tone={STAGE_TONE[h.fromStage]}>{tStage(h.fromStage)}</ToneBadge>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                    <ToneBadge tone={STAGE_TONE[h.toStage]}>{tStage(h.toStage)}</ToneBadge>
                  </>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                <span className="break-all">{t('by', { who })}</span> · {formatDateTime(h.at, locale)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
