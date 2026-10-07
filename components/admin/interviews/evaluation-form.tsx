'use client';

import { ArrowLeft, CheckCircle2, CircleAlert, Link2, Loader2, Save, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/ui';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { useUnsavedChanges } from '@/lib/admin/unsaved';
import { EVALUATION_RESULTS, EVALUATOR_ROLES } from '@/lib/constants';
import { GENERAL_ITEMS, outcomeOf, SCORE_LEVELS, SENIOR_ITEMS } from '@/lib/interview/scoring';
import type { InterviewEvaluation } from '@/lib/repositories/interview-evaluations';
import { cn } from '@/lib/utils';
import { CandidatePicker, type PickedCandidate } from './candidate-picker';
import { FIELD, Labeled, Segmented } from './fields';

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

function initialState(evaluation: InterviewEvaluation | null, today: string): FormState {
  if (!evaluation) {
    return {
      link: null,
      candidateName: '',
      position: '',
      department: '',
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
}: {
  evaluation: InterviewEvaluation | null;
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
  const [initial] = useState(() => initialState(evaluation, today));
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
      toast.error(t('errors.fix'));
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

    setSaving(true);
    try {
      if (evaluation) {
        await adminFetch(`/interview-evaluations/${evaluation.id}`, { method: 'PUT', json: body });
        toast.success(t('saved'));
      } else {
        await adminFetch('/interview-evaluations', { method: 'POST', json: body });
        toast.success(t('created'));
      }
      router.push('/admin/interviews');
      router.refresh();
    } catch (error) {
      toast.error(t('saveFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
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
        return (
          <li key={key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-800">
              <span className="mr-1.5 font-semibold text-gray-400">{offset + i + 1}.</span>
              {label}
            </span>
            <div className="flex shrink-0 gap-1" role="radiogroup" aria-label={label}>
              {SCORE_LEVELS.map((level) => {
                const on = list[i] === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={on}
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
      <Link
        href="/admin/interviews"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </Link>
      <PageHeader title={evaluation ? t('titleEdit') : t('titleNew')} subtitle={t('subtitle')} />

      {readOnly && evaluation && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('readOnly', { who: evaluation.evaluator.name || evaluation.evaluator.email })}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <fieldset disabled={readOnly} className="min-w-0 space-y-6">
          {/* Candidate */}
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
                  onChange={(e) => set('candidateName', e.target.value)}
                  className={FIELD}
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
                onChange={(e) => set('senior', e.target.checked)}
              />
              {t('seniorToggle')}
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
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('result')}>
              {EVALUATION_RESULTS.map((r) => {
                const on = form.result === r;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={on}
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
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? t('saving') : t('save')}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
