import { getTranslations } from 'next-intl/server';
import { RESULT_TONE, ToneBadge } from '@/components/admin/ui';
import { formatAverage, type CandidateResult, type ScorePart } from '@/lib/interview/summary';
import { cn } from '@/lib/utils';

/*
 * A candidate's result (lib/interview/summary.ts candidateResult), as the
 * admin list's row and the candidate page's summary both show it.
 */

/** The average score over both rounds, the pass mark under it. */
export async function ResultScore({ result, large = false }: { result: CandidateResult; large?: boolean }) {
  const tf = await getTranslations('interviews.form');
  return (
    <div className="whitespace-nowrap">
      <div className={cn('font-semibold text-gray-900', large && 'text-2xl font-black tracking-tight')}>
        {formatAverage(result.score)}
        <span className={cn(large && 'text-sm font-semibold text-gray-400')}>/{result.max}</span>
      </div>
      <div className={result.meetsPassMark ? 'text-xs text-emerald-700' : 'text-xs text-red-600'}>
        {result.meetsPassMark ? tf('meets') : tf('notMeets')}
      </div>
    </div>
  );
}

/** The result chosen most, and each round's own under it. */
export async function ResultVerdict({ result }: { result: CandidateResult }) {
  const tf = await getTranslations('interviews.form');
  const t = await getTranslations('interviews.list');
  return (
    <div className="space-y-1">
      <ToneBadge tone={RESULT_TONE[result.verdict]}>{tf(`results.${result.verdict}`)}</ToneBadge>
      <div className="space-y-0.5 text-xs text-gray-500">
        {result.rounds.map(({ round, result: r }) => (
          <div key={round}>
            {tf(`rounds.${round}`)}:{' '}
            <span className={r ? 'font-medium text-gray-700' : 'text-gray-400'}>
              {r ? tf(`results.${r}`) : t('noneYet')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * How the score comes about, as sums: per part (items 1–10; 11–15 when scored),
 * each round's evaluators averaged, then the two rounds averaged; the parts added.
 */
export async function ScoreFormula({ result }: { result: CandidateResult }) {
  const t = await getTranslations('interviews.candidate.formula');
  const tf = await getTranslations('interviews.form');
  const n = formatAverage;
  const mean = (values: number[], value: number) =>
    values.length === 1 ? n(value) : `(${values.map(n).join(' + ')}) ÷ ${values.length} = ${n(value)}`;
  const { general, senior } = result.formula;
  const part = (title: string, p: ScorePart) => (
    <div>
      <div className="font-semibold text-gray-700">{title}</div>
      <ul className="mt-0.5 space-y-0.5 tabular-nums">
        {p.rounds.map((r) => (
          <li key={r.round}>
            {tf(`rounds.${r.round}`)}: {mean(r.totals, r.average)}
          </li>
        ))}
        {p.rounds.length === 2 && (
          <li>
            {t('both')}:{' '}
            {mean(
              p.rounds.map((r) => r.average),
              p.overall,
            )}
          </li>
        )}
      </ul>
    </div>
  );
  return (
    <div className="space-y-2 text-xs text-gray-600">
      <div className="font-bold text-gray-900">{t('title')}</div>
      {part(t('general'), general)}
      {senior && part(t('senior'), senior)}
      {senior && (
        <div className="font-semibold text-gray-900 tabular-nums">
          {t('total')}: {n(general.overall)} + {n(senior.overall)} = {n(result.score)} / {result.max}
        </div>
      )}
    </div>
  );
}
