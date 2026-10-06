'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { cx } from '@/lib/cx';
import s from './apply.module.css';
import { FieldError, inputClass } from './field';
import { MAX_SKILLS, SKILL_GROUPS, type SkillGroupKey } from './options';

type Groups = Record<SkillGroupKey, { title: string; items: string[] }>;

const uniq = (list: string[]) => Array.from(new Set(list));

/**
 * The skills section: chosen chips, search, the category list (tabs on a
 * phone), the pills of the current category, and a custom skill box. Values
 * are the English skill names (see options.ts); the pills show them in the
 * page's language. At most 8.
 */
export function SkillsPicker({
  skills,
  onChange,
  error,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
  error?: string;
}) {
  const t = useTranslations('apply');
  const tf = useTranslations('jobs.form');
  const tc = useTranslations('common');
  const groups = t.raw('skills.groups') as Groups;

  const [tab, setTab] = useState<SkillGroupKey>(SKILL_GROUPS[0].key);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');

  // value → label in this language, for every known skill.
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of SKILL_GROUPS) g.values.forEach((v, i) => map.set(v, groups[g.key]?.items[i] ?? v));
    return map;
  }, [groups]);
  const labelOf = (value: string) => labels.get(value) ?? value;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (v: string) => v.toLowerCase().includes(q) || (labels.get(v) ?? '').toLowerCase().includes(q);
    const tabItems: string[] = [...(SKILL_GROUPS.find((g) => g.key === tab)?.values ?? [])];
    const filteredTab = q ? tabItems.filter(matches) : tabItems;
    const all: string[] = SKILL_GROUPS.flatMap((g) => [...g.values]);
    const globalHits = q ? all.filter(matches).slice(0, 12) : [];
    return uniq([...filteredTab, ...globalHits]).slice(0, 36);
  }, [tab, query, labels]);

  const has = (value: string) => skills.some((x) => x.toLowerCase() === value.toLowerCase());

  function toggle(value: string) {
    if (skills.includes(value)) return onChange(skills.filter((x) => x !== value));
    if (skills.length >= MAX_SKILLS) return;
    onChange(uniq([...skills, value]).slice(0, MAX_SKILLS));
  }

  function addCustom() {
    const clean = custom.trim().slice(0, 60);
    if (!clean) return;
    // A custom entry that is a known skill's label adds that skill.
    const known = [...labels].find(
      ([v, l]) => l.toLowerCase() === clean.toLowerCase() || v.toLowerCase() === clean.toLowerCase(),
    );
    const value = known ? known[0] : clean;
    if (has(value)) return setCustom('');
    if (skills.length >= MAX_SKILLS) return;
    onChange([...skills, value]);
    setCustom('');
  }

  return (
    <div className="mt-10" role="group" aria-labelledby="apply-skills-title">
      <div className="flex items-center justify-between gap-3">
        <div id="apply-skills-title" className="text-sm font-black text-slate-900">
          {tf('skills')}
        </div>
        <div className="text-xs text-slate-600" aria-live="polite">
          {tf('skillsSelected')}: {skills.length}/{MAX_SKILLS}
        </div>
      </div>

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((v) => (
            <span key={v} className={cx(s.badge, 'border-slate-200 bg-white text-slate-800')}>
              {labelOf(v)}
              <button
                type="button"
                className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-slate-100"
                onClick={() => onChange(skills.filter((x) => x !== v))}
                aria-label={t('skills.removeSkill', { skill: labelOf(v) })}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={inputClass('pl-10', s.searchInput)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tf('skillsSearchPlaceholder')}
            aria-label={tf('skillsSearchPlaceholder')}
          />
        </div>
      </div>

      <div className={cx('mt-3', s.skillsGrid)}>
        {/* Categories */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80">
          <div className={s.frameTitle}>
            <strong>{t('skills.categoriesTitle')}</strong>
            <span className="text-[11px] text-slate-500">{t('skills.pickGroup')}</span>
          </div>

          <div className={cx(s.frameBody, 'md:hidden')}>
            <div className={s.tabsRow}>
              {SKILL_GROUPS.map((g) => {
                const active = g.key === tab;
                return (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={active}
                    className={cx(
                      s.badge,
                      'whitespace-nowrap transition',
                      active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'hover:bg-slate-100',
                    )}
                    onClick={() => setTab(g.key)}
                  >
                    {groups[g.key]?.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="p-3">
              <div className="flex flex-col gap-2">
                {SKILL_GROUPS.map((g) => {
                  const active = g.key === tab;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      aria-pressed={active}
                      className={cx(
                        'w-full rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition',
                        active
                          ? 'border-blue-200 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                      )}
                      onClick={() => setTab(g.key)}
                    >
                      {groups[g.key]?.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80">
          <div className={s.frameTitle}>
            <strong>{groups[tab]?.title}</strong>
            <span className="text-[11px] text-slate-500">{t('skills.chooseUpTo')}</span>
          </div>

          <div className={s.frameBody}>
            <div className={s.skillPills}>
              {suggestions.map((v) => {
                const active = skills.includes(v);
                const disabledPick = !active && skills.length >= MAX_SKILLS;
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={disabledPick}
                    aria-pressed={active}
                    className={cx(s.skillPill, active && s.skillPillOn, disabledPick && s.skillPillDisabled)}
                    onClick={() => toggle(v)}
                    title={labelOf(v)}
                  >
                    <span>{labelOf(v)}</span>
                    <span
                      aria-hidden="true"
                      className={cx('text-xs font-black', active ? 'text-blue-700' : 'text-slate-400')}
                    >
                      {active ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px]">
              <input
                className={inputClass()}
                value={custom}
                maxLength={60}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={tf('skillsAddCustomPlaceholder')}
                aria-label={tf('skillsAddCustomPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addCustom}
                disabled={!custom.trim() || skills.length >= MAX_SKILLS}
              >
                {tc('add')}
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-500">{tf('skillsTip')}</div>
            <FieldError id="apply-skills" error={error} />
          </div>
        </div>
      </div>
    </div>
  );
}
