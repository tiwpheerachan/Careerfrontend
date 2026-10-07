'use client';

import { ArrowLeft, CheckCircle2, CircleAlert, Link2, Loader2, Mail, PencilLine, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { GuardedLink } from '@/components/admin/shell/unsaved-guard';
import { PageHeader } from '@/components/admin/ui';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { discardUnsavedChanges, useGuardedNavigation, useUnsavedChanges } from '@/lib/admin/unsaved';
import { EVALUATION_RESULTS, EVALUATOR_ROLES } from '@/lib/constants';
import { GENERAL_ITEMS, outcomeOf, SCORE_LEVELS, SENIOR_ITEMS } from '@/lib/interview/scoring';
import type { InterviewEvaluation } from '@/lib/repositories/interview-evaluations';
import { cn } from '@/lib/utils';
import { CandidatePicker, type PickedCandidate } from './candidate-picker';
import { FIELD, Labeled, onRadioKeyDown, radioTabIndex, Segmented } from './fields';

type Score = number | null;
type Result = (typeof EVALUATION_RESULTS)[number];
type Role = (typeof EVALUATOR_ROLES)[number];

interface FormState {
  link: { kind: 'application' | 'form'; id: string } | null;
  candidateName: string;
  position: string;
  department: string;
  interviewDate: string;
  round: 1 | 2;
  evaluatorRole: Role;
  senior: boolean;
  general: Score[];
  seniorScores: Score[];
  result: Result | '';
  failReason: string;
  comment: string;
}

/** Who a new evaluation starts with (from ?candidate=), as the candidate picker would fill it. */
export interface Prefill {
  link: { kind: 'application' | 'form'; id: string } | null;
  name: string;
  position: string | null;
  department: string | null;
}

function initialState(evaluation: InterviewEvaluation | null, today: string, prefill?: Prefill): FormState {
  if (!evaluation) {
    return {
      link: prefill?.link ?? null,
      candidateName: prefill?.name ?? '',
      position: prefill?.position ?? '',
      department: prefill?.department ?? '',
      interviewDate: today,
      round: 1,
      evaluatorRole: 'HR',
      senior: false,
      general: GENERAL_ITEMS.map(() => null),
      seniorScores: SENIOR_ITEMS.map(() => null),
      result: '',
      failReason: '',
      comment: '',
    };
  }
  const c = evaluation.candidate;
  return {
    link: c.kind !== 'manual' && c.id ? { kind: c.kind, id: c.id } : null,
    candidateName: c.name,
    position: c.position ?? '',
    department: c.department ?? '',
    interviewDate: evaluation.interviewDate,
    round: evaluation.round,
    evaluatorRole: evaluation.evaluatorRole,
    senior: evaluation.senior,
    general: [...evaluation.generalScores],
    seniorScores: evaluation.seniorScores ? [...evaluation.seniorScores] : SENIOR_ITEMS.map(() => null),
    result: evaluation.result,
    failReason: evaluation.failReason ?? '',
    comment: evaluation.comment ?? '',
  };
}

const RESULT_STYLE: Record<Result, string> = {
  PENDING: 'border-amber-300 bg-amber-50 text-amber-800',
  PASS: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  FAIL: 'border-red-300 bg-red-50 text-red-700',
};

/**
 * The interview evaluation form (แบบประเมินผลสัมภาษณ์), as on paper, made
 * quick: each item is a row of 0–5 buttons, the totals and the pass mark
 * (lib/interview/scoring.ts) update as you go, and items 11–15 appear only
 * for a Senior position.
 *
 * `evaluation` null = a new one. `readOnly` = someone else's (only its
 * evaluator, or manage, may change it — the API checks the same).
 */
export function EvaluationForm({
  evaluation,
  today,
  evaluator,
  readOnly,
  prefill,
  guest,
  backHref = '/admin/interviews',
  materials,
}: {
  evaluation: InterviewEvaluation | null;
  /**
   * Filling it in through an invitation link (app/evaluate): the candidate,
   * round and side are the link's and cannot change; it is sent once, to
   * POST /api/v1/evaluate/{token}, after a confirmation.
   */
  guest?: { token: string; round: 1 | 2; evaluatorRole: Role; senior: boolean };
  /** Where "back" (and a save) goes: the page it was opened from. */
  backHref?: string;
  /** The candidate's application, under their details (an invitation link). */
  materials?: ReactNode;
  /** A new evaluation's candidate, when it was started from their page. */
  prefill?: Prefill;
  /** Today in Bangkok (YYYY-MM-DD), from the server, so the default date never mismatches. */
  today: string;
  /** Who it is (or will be) saved as. */
  evaluator: string;
  readOnly: boolean;
}) {
  const t = useTranslations('interviews.form');
  const items = useTranslations('interviews.items');
  const scale = useTranslations('interviews.scale');
  const router = useRouter();
  const nav = useGuardedNavigation();
  const format = useFormatter();
  const [initial] = useState(() => {
    const state = initialState(evaluation, today, prefill);
    return guest ? { ...state, round: guest.round, evaluatorRole: guest.evaluatorRole, senior: guest.senior } : state;
  });
  /** After a failed save: the unscored rows are marked. */
  const [showMissing, setShowMissing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useUnsavedChanges(dirty && !readOnly);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const { [key]: _gone, ...rest } = e;
      return rest;
    });
  };

  const scored = (list: Score[]) => list.map((s) => s ?? 0);
  const outcome = useMemo(
    () => outcomeOf({ general: scored(form.general), senior: form.senior ? scored(form.seniorScores) : null }),
    [form.general, form.seniorScores, form.senior],
  );
  const missing =
    form.general.filter((s) => s === null).length +
    (form.senior ? form.seniorScores.filter((s) => s === null).length : 0);

  const pickCandidate = (c: PickedCandidate) =>
    setForm((f) => ({
      ...f,
      link: { kind: c.kind, id: c.id },
      candidateName: c.name,
      position: c.position ?? '',
      department: c.department ?? '',
    }));

  const save = async () => {
    const found: Record<string, string> = {};
    if (!form.candidateName.trim()) found.candidateName = t('errors.candidateName');
    if (!form.interviewDate) found.interviewDate = t('errors.interviewDate');
    if (missing) found.scores = t('errors.scores');
    if (!form.result) found.result = t('errors.result');
    setErrors(found);
    if (Object.keys(found).length) {
      setShowMissing(Boolean(found.scores));
      toast.error(t('errors.fix'));
      goToFirstError(found);
      return;
    }

    const body = {
      applicationId: form.link?.kind === 'application' ? form.link.id : null,
      applicationFormId: form.link?.kind === 'form' ? form.link.id : null,
      candidateName: form.candidateName,
      position: form.position,
      department: form.department,
      interviewDate: form.interviewDate,
      round: form.round,
      evaluatorRole: form.evaluatorRole,
      senior: form.senior,
      generalScores: scored(form.general),
      seniorScores: form.senior ? scored(form.seniorScores) : null,
      result: form.result,
      failReason: form.result === 'FAIL' ? form.failReason : '',
      comment: form.comment,
    };

    if (guest) {
      setConfirming(true);
      return;
    }

    setSaving(true);
    try {
      if (evaluation) {
        await adminFetch(`/interview-evaluations/${evaluation.id}`, { method: 'PUT', json: body });
        toast.success(t('saved'));
      } else {
        await adminFetch('/interview-evaluations', { method: 'POST', json: body });
        toast.success(t('created'));
      }
      discardUnsavedChanges();
      router.push(backHref);
      router.refresh();
    } catch (error) {
      const status = error instanceof AdminApiError ? error.status : undefined;
      // The same person, round and side already evaluated: offer the one there is.
      const twin =
        status === 409 && error instanceof Error ? /evaluation ([0-9a-f-]{36})/.exec(error.message)?.[1] : null;
      toast.error(t('saveFailed'), {
        description: problemOf(status) ?? (error instanceof AdminApiError ? error.message : undefined),
        action: twin ? { label: t('openExisting'), onClick: () => nav.push(`/admin/interviews/${twin}`) } : undefined,
        duration: twin ? 10_000 : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  /** What a refusal means, in the reader's language (the API's own message is English). */
  const problemOf = (status: number | undefined) =>
    status === 401
      ? t('errors.signedOut')
      : status === 403
        ? t('errors.forbidden')
        : status === 409
          ? guest
            ? t('errors.alreadySent')
            : t('errors.duplicate')
          : status === 410
            ? t('errors.gone')
            : undefined;

  /** Scroll to (and focus) the first thing to fix, top to bottom. */
  const goToFirstError = (found: Record<string, string>) => {
    const firstUnscored = () => {
      const general = form.general.findIndex((x) => x === null);
      if (general >= 0) return `ev-score-general-${general}`;
      return `ev-score-seniorScores-${form.seniorScores.findIndex((x) => x === null)}`;
    };
    const id = found.candidateName
      ? 'ev-name'
      : found.interviewDate
        ? 'ev-date'
        : found.scores
          ? firstUnscored()
          : found.result
            ? 'ev-result'
            : null;
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (target.matches('input, button') ? target : target.querySelector<HTMLElement>('button'))?.focus({
      preventScroll: true,
    });
  };

  /** The invitee's evaluation, once confirmed: sent, then the page shows it was. */
  const sendAsGuest = async () => {
    if (!guest) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/evaluate/${guest.token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          senior: form.senior,
          generalScores: scored(form.general),
          seniorScores: form.senior ? scored(form.seniorScores) : null,
          result: form.result,
          failReason: form.result === 'FAIL' ? form.failReason : '',
          comment: form.comment,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        toast.error(t('saveFailed'), { description: problemOf(response.status) ?? body?.error?.message });
        // Expired, switched off or already sent: the page says which.
        if ([401, 403, 409, 410].includes(response.status)) {
          setConfirming(false);
          discardUnsavedChanges();
          router.refresh();
        }
        return;
      }
      setConfirming(false);
      discardUnsavedChanges();
      toast.success(t('created'));
      router.refresh();
    } catch {
      toast.error(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * One score, set from the latest state — not from this render's `list` —
   * so clicks quicker than a re-render cannot overwrite each other.
   */
  const setScore = (field: 'general' | 'seniorScores', index: number, level: number) => {
    setForm((f) => ({ ...f, [field]: f[field].map((s, j) => (j === index ? level : s)) }));
    setErrors((e) => {
      const { scores: _gone, ...rest } = e;
      return rest;
    });
  };

  const scoreRows = (keys: readonly string[], list: Score[], offset: number, field: 'general' | 'seniorScores') => (
    <ol className="divide-y divide-gray-100">
      {keys.map((key, i) => {
        const label = items(key);
        const unscored = showMissing && list[i] === null;
        return (
          <li
            key={key}
            id={`ev-score-${field}-${i}`}
            className={cn(
              'flex scroll-mt-24 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between',
              unscored && '-mx-3 rounded-lg bg-red-50 px-3',
            )}
          >
            <span className={cn('text-sm', unscored ? 'font-semibold text-red-700' : 'text-gray-800')}>
              <span className="mr-1.5 font-semibold text-gray-400">{offset + i + 1}.</span>
              {label}
            </span>
            <div
              className="flex shrink-0 gap-1"
              role="radiogroup"
              aria-label={label}
              aria-invalid={unscored || undefined}
              onKeyDown={onRadioKeyDown}
            >
              {SCORE_LEVELS.map((level, index) => {
                const on = list[i] === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={radioTabIndex(on, index, list[i] !== null)}
                    aria-label={t('scoreFor', { item: label, score: level })}
                    title={`${level} — ${scale(String(level))}`}
                    disabled={readOnly}
                    onClick={() => setScore(field, i, level)}
                    className={cn(
                      'grid h-9 w-9 place-items-center rounded-lg border text-sm font-bold transition disabled:cursor-default',
                      on
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'border-gray-200 bg-white text-gray-600 enabled:hover:border-blue-400 enabled:hover:bg-blue-50',
                    )}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );

  const sumOf = (list: Score[]) => list.reduce<number>((a, s) => a + (s ?? 0), 0);

  return (
    <div>
      {!guest && (
        <>
          <GuardedLink
            href={backHref}
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> {backHref === '/admin/interviews' ? t('back') : t('backToCandidate')}
          </GuardedLink>
          <PageHeader title={evaluation ? t('titleEdit') : t('titleNew')} subtitle={t('subtitle')} />
        </>
      )}

      {evaluation && (evaluation.viaInvitation || evaluation.edited) && (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {evaluation.viaInvitation && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-800 ring-1 ring-violet-200">
              <Mail className="h-3.5 w-3.5" /> {t('viaInvitation')}
            </span>
          )}
          {evaluation.edited && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700 ring-1 ring-gray-200">
              <PencilLine className="h-3.5 w-3.5" />
              {t('editedBy', {
                who: evaluation.edited.by,
                date: format.dateTime(new Date(evaluation.edited.at), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Asia/Bangkok',
                }),
              })}
            </span>
          )}
        </div>
      )}

      {readOnly && evaluation && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('readOnly', { who: evaluation.evaluator.name || evaluation.evaluator.email })}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <fieldset disabled={readOnly} className="min-w-0 space-y-6">
          {/* Candidate */}
          {guest ? (
            <section className="card p-6">
              <h2 className="mb-3 text-sm font-bold text-gray-900">{t('candidateSection')}</h2>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                {(
                  [
                    [t('candidateName'), form.candidateName],
                    [t('position'), form.position || '—'],
                    [t('department'), form.department || '—'],
                    [t('round'), t(`rounds.${form.round}`)],
                    [t('evaluatorRole'), t(`roles.${form.evaluatorRole}`)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-semibold text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-gray-500">{t('evaluatedBy', { who: evaluator })}</p>
            </section>
          ) : (
            <section className="card p-6">
              <h2 className="mb-4 text-sm font-bold text-gray-900">{t('candidateSection')}</h2>
              {!readOnly && !form.link && <CandidatePicker onPick={pickCandidate} />}
              {form.link && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <span className="inline-flex items-center gap-1.5">
                    <Link2 className="h-4 w-4" />
                    {t('linkedTo')} {t(`kinds.${form.link.kind}`)}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => set('link', null)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                    >
                      <X className="h-3.5 w-3.5" /> {t('unlink')}
                    </button>
                  )}
                </div>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Labeled label={t('candidateName')} htmlFor="ev-name" error={errors.candidateName} required>
                  <Input
                    id="ev-name"
                    value={form.candidateName}
                    maxLength={150}
                    aria-invalid={!!errors.candidateName || undefined}
                    // A linked candidate's name is their record's: the PDF and the
                    // candidate page print that one. Unlink to type another.
                    readOnly={!!form.link}
                    title={form.link ? t('nameFromRecord') : undefined}
                    onChange={(e) => set('candidateName', e.target.value)}
                    className={cn(FIELD, form.link && 'bg-gray-50 text-gray-600')}
                  />
                </Labeled>
                <Labeled label={t('interviewDate')} htmlFor="ev-date" error={errors.interviewDate} required>
                  <Input
                    id="ev-date"
                    type="date"
                    value={form.interviewDate}
                    aria-invalid={!!errors.interviewDate || undefined}
                    onChange={(e) => set('interviewDate', e.target.value)}
                    className={FIELD}
                  />
                </Labeled>
                <Labeled label={t('position')} htmlFor="ev-position">
                  <Input
                    id="ev-position"
                    value={form.position}
                    maxLength={150}
                    onChange={(e) => set('position', e.target.value)}
                    className={FIELD}
                  />
                </Labeled>
                <Labeled label={t('department')} htmlFor="ev-department">
                  <Input
                    id="ev-department"
                    value={form.department}
                    maxLength={150}
                    onChange={(e) => set('department', e.target.value)}
                    className={FIELD}
                  />
                </Labeled>
                <Segmented
                  label={t('round')}
                  value={form.round}
                  options={[1, 2].map((r) => ({ value: r as 1 | 2, label: t(`rounds.${r}`) }))}
                  onChange={(r) => set('round', r)}
                  disabled={readOnly}
                />
                <Segmented
                  label={t('evaluatorRole')}
                  value={form.evaluatorRole}
                  options={EVALUATOR_ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
                  onChange={(r) => set('evaluatorRole', r)}
                  disabled={readOnly}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">{t('evaluatedBy', { who: evaluator })}</p>
            </section>
          )}

          {materials}

          {/* The scale */}
          <section className="card p-6">
            <h2 className="mb-3 text-sm font-bold text-gray-900">{t('scale')}</h2>
            <ul className="flex flex-wrap gap-2 text-xs text-gray-600">
              {SCORE_LEVELS.map((level) => (
                <li key={level} className="rounded-lg bg-gray-50 px-2.5 py-1 ring-1 ring-gray-200">
                  <span className="font-bold text-gray-900">{level}</span> {scale(String(level))}
                </li>
              ))}
            </ul>
          </section>

          {/* Items 1–10 */}
          <section className="card p-6" id="ev-scores">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gray-900">{t('general')}</h2>
              <span className="text-sm font-semibold text-gray-500">
                {t('subtotal', { score: sumOf(form.general), max: 50 })}
              </span>
            </div>
            {scoreRows(GENERAL_ITEMS, form.general, 0, 'general')}

            <label className="mt-4 flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-800">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={form.senior}
                disabled={!!guest}
                onChange={(e) => set('senior', e.target.checked)}
              />
              {t('seniorToggle')}
              {guest && <span className="ml-auto text-xs font-normal text-gray-500">{t('seniorSetByHr')}</span>}
            </label>
            {errors.scores && <p className="mt-2 text-xs font-medium text-red-600">{errors.scores}</p>}
          </section>

          {/* Items 11–15 */}
          {form.senior && (
            <section className="card p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-gray-900">{t('seniorSection')}</h2>
                <span className="text-sm font-semibold text-gray-500">
                  {t('subtotal', { score: sumOf(form.seniorScores), max: 25 })}
                </span>
              </div>
              {scoreRows(SENIOR_ITEMS, form.seniorScores, GENERAL_ITEMS.length, 'seniorScores')}
            </section>
          )}

          {/* Result */}
          <section className="card p-6">
            <h2 className="mb-3 text-sm font-bold text-gray-900">{t('result')}</h2>
            <div
              id="ev-result"
              className="grid scroll-mt-24 gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label={t('result')}
              aria-invalid={!!errors.result || undefined}
              onKeyDown={onRadioKeyDown}
            >
              {EVALUATION_RESULTS.map((r, index) => {
                const on = form.result === r;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={radioTabIndex(on, index, form.result !== '')}
                    onClick={() => set('result', r)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition disabled:cursor-default',
                      on ? RESULT_STYLE[r] : 'border-gray-200 bg-white text-gray-600 enabled:hover:bg-gray-50',
                    )}
                  >
                    {t(`results.${r}`)}
                  </button>
                );
              })}
            </div>
            {errors.result && <p className="mt-2 text-xs font-medium text-red-600">{errors.result}</p>}
            {form.result === 'FAIL' && (
              <div className="mt-4">
                <Labeled label={t('failReason')} htmlFor="ev-fail">
                  <Input
                    id="ev-fail"
                    value={form.failReason}
                    maxLength={300}
                    onChange={(e) => set('failReason', e.target.value)}
                    className={FIELD}
                  />
                </Labeled>
              </div>
            )}
            <div className="mt-4">
              <Labeled label={t('comment')} htmlFor="ev-comment">
                <Textarea
                  id="ev-comment"
                  value={form.comment}
                  maxLength={2000}
                  placeholder={t('commentPlaceholder')}
                  onChange={(e) => set('comment', e.target.value)}
                  className={cn(FIELD, 'min-h-[90px] resize-y')}
                />
              </Labeled>
            </div>
          </section>
        </fieldset>

        {/* The summary (sticky) */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-6">
            <h2 className="text-sm font-bold text-gray-900">{t('summary')}</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tight text-gray-900">{outcome.total}</span>
              <span className="text-lg font-semibold text-gray-400">/ {outcome.max}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  outcome.meetsPassMark ? 'bg-emerald-500' : 'bg-blue-500',
                )}
                style={{ width: `${Math.round((outcome.total / outcome.max) * 100)}%` }}
              />
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('generalPart')}</dt>
                <dd className="font-semibold text-gray-900">{outcome.generalTotal} / 50</dd>
              </div>
              {outcome.seniorTotal !== null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">{t('seniorPart')}</dt>
                  <dd className="font-semibold text-gray-900">{outcome.seniorTotal} / 25</dd>
                </div>
              )}
            </dl>

            <div className="mt-4 rounded-xl border border-gray-200 p-3">
              <div className="text-xs font-semibold text-gray-500">{t('recommendation')}</div>
              {missing ? (
                <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                  <CircleAlert className="h-4 w-4 text-gray-400" />
                  {t('incomplete', { count: missing })}
                </div>
              ) : (
                <div
                  className={cn(
                    'mt-1 flex items-center gap-1.5 text-sm font-bold',
                    outcome.meetsPassMark ? 'text-emerald-700' : 'text-red-600',
                  )}
                >
                  {outcome.meetsPassMark ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                  {outcome.meetsPassMark ? t('meets') : t('notMeets')}
                </div>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                {form.senior ? t('ruleSenior') : t('ruleGeneral')}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">{t('recommendationNote')}</p>
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="mt-5 hidden w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60 lg:inline-flex"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? t('saving') : guest ? t('send') : t('save')}
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Phones: the summary is at the very bottom, so the score and the button stay in reach. */}
      {!readOnly && (
        <div className="sticky bottom-3 z-20 mt-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm lg:hidden">
          <div className="min-w-0 flex-1">
            <div className="text-lg leading-tight font-black text-gray-900">
              {outcome.total}
              <span className="text-sm font-semibold text-gray-400"> / {outcome.max}</span>
            </div>
            <div
              className={cn(
                'truncate text-xs font-semibold',
                missing ? 'text-gray-500' : outcome.meetsPassMark ? 'text-emerald-700' : 'text-red-600',
              )}
            >
              {missing ? t('incomplete', { count: missing }) : outcome.meetsPassMark ? t('meets') : t('notMeets')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('saving') : guest ? t('send') : t('save')}
          </button>
        </div>
      )}
      {guest && (
        <AlertDialog open={confirming} onOpenChange={(open) => !saving && setConfirming(open)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmBody', {
                  total: outcome.total,
                  max: outcome.max,
                  result: form.result ? t(`results.${form.result}`) : '',
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>{t('confirmCancel')}</AlertDialogCancel>
              <AlertDialogAction
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault();
                  void sendAsGuest();
                }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('confirmSend')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
