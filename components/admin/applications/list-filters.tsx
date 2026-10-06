'use client';

import { Check, ChevronsUpDown, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition, type FormEvent } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { APPLICATION_STAGES } from '@/lib/constants';
import type { ApplicationStage } from '@/lib/constants-types';
import { cn } from '@/lib/utils';
import { listHref, type ListQuery } from './list-query';

export interface JobOption {
  id: string;
  code: string;
  title: string;
  applicantCount: number;
}

/** Search box, job combobox and stage chips — every change goes to the url. */
export function ListFilters({
  query,
  jobs,
  stageCounts,
}: {
  query: ListQuery;
  jobs: JobOption[];
  stageCounts: Record<ApplicationStage, number>;
}) {
  const t = useTranslations('applications.list');
  const tStage = useTranslations('stage');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (patch: Partial<ListQuery>) => startTransition(() => router.push(listHref(query, patch)));

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    if (q !== query.q) go({ q });
  };

  const allCount = APPLICATION_STAGES.reduce((sum, s) => sum + stageCounts[s], 0);

  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center',
        pending && 'opacity-70 transition-opacity',
      )}
      aria-busy={pending}
    >
      {/* key: the box follows the url — back/forward puts the old search back in it. */}
      <form key={query.q} onSubmit={onSearch} role="search" className="relative md:min-w-64 md:flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          name="q"
          type="search"
          defaultValue={query.q}
          aria-label={tCommon('search')}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm outline-hidden placeholder:text-gray-400 focus:border-blue-600"
        />
      </form>

      <JobCombobox jobs={jobs} value={query.jobId} onChange={(jobId) => go({ jobId })} />

      <ToggleGroup
        type="single"
        spacing={2}
        value={query.stage ?? 'ALL'}
        onValueChange={(value) => {
          if (!value) return; // clicking the active chip keeps it
          go({ stage: value === 'ALL' ? null : (value as ApplicationStage) });
        }}
        aria-label={t('stageFilter')}
        className="flex-wrap"
      >
        <StageChip value="ALL" label={tCommon('all')} count={allCount} />
        {APPLICATION_STAGES.map((stage) => (
          <StageChip key={stage} value={stage} label={tStage(stage)} count={stageCounts[stage]} />
        ))}
      </ToggleGroup>
    </div>
  );
}

/** The old `.chip`, active = blue border + blue tint, with the number of matches. */
function StageChip({ value, label, count }: { value: string; label: string; count: number }) {
  return (
    <ToggleGroupItem
      value={value}
      className={cn(
        'h-auto gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-normal text-gray-700 hover:bg-gray-50 hover:text-gray-700',
        'data-[state=on]:border-blue-600 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700',
      )}
    >
      {label}
      <span className="text-xs text-gray-400 tabular-nums group-data-[state=on]/toggle:text-blue-600/70">{count}</span>
    </ToggleGroupItem>
  );
}

/** "All jobs" or one job, searchable by title or code, with how many applied. */
function JobCombobox({
  jobs,
  value,
  onChange,
}: {
  jobs: JobOption[];
  value: string | null;
  onChange: (jobId: string | null) => void;
}) {
  const t = useTranslations('applications.list');
  const [open, setOpen] = useState(false);
  const selected = jobs.find((j) => j.id === value);

  const pick = (jobId: string | null) => {
    setOpen(false);
    if (jobId !== value) onChange(jobId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls="job-filter-list"
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-900 outline-hidden focus-visible:border-blue-600 md:w-72 md:shrink-0"
        >
          <span className="truncate">{selected ? selected.title : value ? value : t('allJobs')}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command>
          <CommandInput placeholder={t('jobSearch')} />
          <CommandList id="job-filter-list">
            <CommandEmpty>{t('jobEmpty')}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__all__" keywords={[t('allJobs')]} onSelect={() => pick(null)}>
                <Check className={cn('h-4 w-4', value ? 'opacity-0' : 'opacity-100')} />
                {t('allJobs')}
              </CommandItem>
              {jobs.map((job) => (
                <CommandItem
                  key={job.id}
                  value={job.id}
                  keywords={[job.title, job.code]}
                  onSelect={() => pick(job.id)}
                  className="items-start"
                >
                  <Check className={cn('mt-0.5 h-4 w-4', value === job.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{job.title}</span>
                    <span className="block truncate text-xs text-gray-400">{job.code}</span>
                  </span>
                  <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                    {t('applicantCount', { count: job.applicantCount })}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** The blue "showing applicants for …" bar, with a way out. */
export function JobBanner({ query, jobTitle }: { query: ListQuery; jobTitle: string }) {
  const t = useTranslations('applications.list');
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-2.5 text-sm ring-1 ring-blue-200/60 ring-inset">
      <span className="text-blue-800">
        {t('filteringByJob')} <span className="font-bold">{jobTitle}</span>
      </span>
      <Link href={listHref(query, { jobId: null })} className="shrink-0 font-semibold text-blue-700 hover:underline">
        {t('clearFilter')}
      </Link>
    </div>
  );
}
