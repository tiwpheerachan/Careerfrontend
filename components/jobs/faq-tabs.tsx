'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Accordion, Tabs } from 'radix-ui';
import { useState } from 'react';
import { cx } from '@/lib/cx';

type FaqItem = { q: string; a: string };

const TABS = ['fulltime', 'internship', 'tech'] as const;
type Tab = (typeof TABS)[number];

/**
 * The Jobs page FAQ: three categories, one answer open at a time (the first
 * by default). Ported from the old JobsPage `FaqTabs`, same look, on radix
 * Tabs + Accordion for keyboard and screen-reader support.
 */
export function FaqTabs() {
  const t = useTranslations('jobs.faq');
  const [tab, setTab] = useState<Tab>('fulltime');
  const [openIdx, setOpenIdx] = useState('0');

  const data: Record<Tab, FaqItem[]> = {
    fulltime: t.raw('data.fulltime') as FaqItem[],
    internship: t.raw('data.internship') as FaqItem[],
    tech: t.raw('data.tech') as FaqItem[],
  };
  const labels: Record<Tab, string> = {
    fulltime: t('tabs.fulltime'),
    internship: t('tabs.internship'),
    tech: t('tabs.tech'),
  };

  return (
    <div className="card p-6 md:p-8">
      <div className="text-center">
        <h2 className="text-xl font-black tracking-tight md:text-2xl">{t('title')}</h2>
        <p className="mt-2 text-sm text-slate-600">{t('subtitle')}</p>
      </div>

      <Tabs.Root
        value={tab}
        onValueChange={(v) => {
          setTab(v as Tab);
          setOpenIdx('0');
        }}
      >
        <div className="mt-6 flex justify-center">
          <Tabs.List className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {TABS.map((key) => (
              <Tabs.Trigger
                key={key}
                value={key}
                className={cx(
                  'rounded-xl px-5 py-2 text-sm font-semibold transition',
                  tab === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {labels[key]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        {TABS.map((key) => (
          <Tabs.Content key={key} value={key} className="outline-hidden">
            <Accordion.Root
              type="single"
              collapsible
              value={openIdx}
              onValueChange={setOpenIdx}
              className="mt-6 space-y-3"
            >
              {data[key].map((it, idx) => (
                <Accordion.Item key={idx} value={String(idx)} className="rounded-2xl border border-slate-200 bg-white">
                  <Accordion.Header>
                    <Accordion.Trigger className="group flex w-full items-start justify-between gap-4 px-5 py-4 text-left">
                      <div className="text-sm font-semibold text-slate-900">{it.q}</div>
                      <div className="mt-0.5 shrink-0 text-slate-500">
                        <ChevronDown className="h-5 w-5 group-data-[state=open]:hidden" />
                        <ChevronUp className="hidden h-5 w-5 group-data-[state=open]:block" />
                      </div>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="border-t border-slate-100 px-5 py-4">
                    <div className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{it.a}</div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}
