'use client';

import { FileText, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/ui';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { useUnsavedChanges } from '@/lib/admin/unsaved';
import type { LOCALES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ContentField } from './content-field';

type SiteLocale = (typeof LOCALES)[number];

export interface ContentOverride {
  value: string;
  updatedBy: string | null;
  updatedAt: string;
}

/** The website's languages, each in its own script (not translated, like the header's language picker). */
const LANGS: Array<{ key: SiteLocale; label: string }> = [
  { key: 'th', label: 'ไทย' },
  { key: 'en', label: 'English' },
  { key: 'zh', label: '中文' },
];

const errorText = (error: unknown) =>
  error instanceof AdminApiError
    ? error.issues.length
      ? error.issues.map((i) => i.message).join(' · ')
      : error.message
    : String(error);

/**
 * Edits the public site's text for one language. Each string in
 * messages/<lang>.json is a card; saving writes an override, "revert" removes
 * it. Keys are grouped by their first segment (home, about, jobs…) so the
 * 600-odd keys stay navigable; a search opens the sections it matches in.
 */
export function ContentEditor({
  lang,
  defaults,
  overrides,
}: {
  lang: SiteLocale;
  /** [key, built-in text], in file order. */
  defaults: Array<[string, string]>;
  overrides: Record<string, ContentOverride>;
}) {
  const t = useTranslations('content');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [switching, startSwitch] = useTransition();
  const [shownLang, setShownLang] = useOptimistic(lang);

  /** Typed but not saved, by key. */
  const [edited, setEdited] = useState<Record<string, string>>({});
  /** What a save / revert just did, until the refreshed page brings it (null = reverted). */
  const [patch, setPatch] = useState<Record<string, ContentOverride | null>>({});
  const [busy, setBusy] = useState<Record<string, true>>({});
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string[]>([]);
  /** Sections opened/closed while a search is active; null = the ones the search matches. */
  const [searchOpen, setSearchOpen] = useState<string[] | null>(null);
  const [revertKey, setRevertKey] = useState<string | null>(null);
  const [pendingLang, setPendingLang] = useState<SiteLocale | null>(null);

  // A new language starts clean; fresh overrides from the server replace the local patch.
  const [prev, setPrev] = useState({ lang, overrides });
  if (prev.lang !== lang || prev.overrides !== overrides) {
    if (prev.lang !== lang) setEdited({});
    setPatch({});
    setPrev({ lang, overrides });
  }

  const defaultOf = useMemo(() => new Map(defaults), [defaults]);
  const overrideOf = useCallback(
    (key: string): ContentOverride | null => (key in patch ? (patch[key] ?? null) : (overrides[key] ?? null)),
    [patch, overrides],
  );
  const storedOf = useCallback(
    (key: string) => overrideOf(key)?.value ?? defaultOf.get(key) ?? '',
    [overrideOf, defaultOf],
  );
  const isDirty = (key: string) => key in edited && edited[key] !== storedOf(key);

  const dirtyCount = Object.keys(edited).filter(isDirty).length;
  // Only overrides of keys the site still has.
  const overrideCount = defaults.filter(([key]) => overrideOf(key) !== null).length;

  // Leaving the page (reload, close, typed url, the sidebar) with unsaved text asks first.
  useUnsavedChanges(dirtyCount > 0);

  const query = search.trim().toLowerCase();
  const sections = useMemo(() => {
    const groups: Array<{ id: string; entries: Array<[string, string]>; total: number; edited: number }> = [];
    const byId = new Map<string, (typeof groups)[number]>();
    for (const entry of defaults) {
      const [key, text] = entry;
      const id = key.split('.', 1)[0] ?? key;
      const group = byId.get(id) ?? { id, entries: [], total: 0, edited: 0 };
      if (!byId.has(id)) {
        byId.set(id, group);
        groups.push(group);
      }
      group.total += 1;
      const override = overrideOf(key);
      if (override) group.edited += 1;
      if (
        !query ||
        key.toLowerCase().includes(query) ||
        text.toLowerCase().includes(query) ||
        (override?.value.toLowerCase().includes(query) ?? false)
      ) {
        group.entries.push(entry);
      }
    }
    return query ? groups.filter((g) => g.entries.length) : groups;
  }, [defaults, overrideOf, query]);

  const shown = sections.reduce((sum, s) => sum + s.entries.length, 0);
  const accordionValue = query ? (searchOpen ?? sections.map((s) => s.id)) : open;

  const onChange = useCallback((key: string, value: string) => setEdited((e) => ({ ...e, [key]: value })), []);

  const setBusyKey = (key: string, on: boolean) =>
    setBusy((b) => {
      const next = { ...b };
      if (on) next[key] = true;
      else delete next[key];
      return next;
    });

  const forget = (key: string) =>
    setEdited((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });

  const onSave = useCallback(
    async (key: string, value: string) => {
      setBusyKey(key, true);
      try {
        await adminFetch('/content', { method: 'PUT', json: { key, locale: lang, value } });
        setPatch((p) => ({ ...p, [key]: { value, updatedBy: null, updatedAt: new Date().toISOString() } }));
        forget(key);
        toast.success(t('savedToast'), { description: key });
        router.refresh();
      } catch (error) {
        toast.error(t('saveFailed'), { description: errorText(error) });
      } finally {
        setBusyKey(key, false);
      }
    },
    [lang, router, t],
  );

  const onRevert = useCallback((key: string) => setRevertKey(key), []);

  const revert = async (key: string) => {
    setBusyKey(key, true);
    try {
      const params = new URLSearchParams({ key, locale: lang });
      await adminFetch(`/content?${params}`, { method: 'DELETE' });
      setPatch((p) => ({ ...p, [key]: null }));
      forget(key);
      toast.success(t('reverted'), { description: key });
      router.refresh();
    } catch (error) {
      toast.error(t('revertFailed'), { description: errorText(error) });
    } finally {
      setBusyKey(key, false);
    }
  };

  const goTo = (next: SiteLocale) => {
    startSwitch(() => {
      setShownLang(next);
      router.push(`/admin/content?lang=${next}`, { scroll: false });
    });
  };

  const onLangChange = (value: string) => {
    const next = value as SiteLocale;
    if (next === lang) return;
    if (dirtyCount) setPendingLang(next);
    else goTo(next);
  };

  const langLabel = (key: SiteLocale) => LANGS.find((l) => l.key === key)?.label ?? key;
  const sectionLabel = (id: string) => (t.has(`sections.${id}`) ? t(`sections.${id}`) : id);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title={t('title')}
        subtitle={t('subtitle', { count: overrideCount })}
        actions={
          <Tabs value={shownLang} onValueChange={onLangChange}>
            <TabsList aria-label={t('siteLanguage')} className="h-auto gap-1 rounded-xl bg-gray-100 p-1">
              {LANGS.map((l) => (
                <TabsTrigger
                  key={l.key}
                  value={l.key}
                  className="h-auto rounded-lg px-3 py-1 text-sm font-medium text-gray-500 data-active:bg-white data-active:text-blue-700 data-active:shadow-xs"
                >
                  {l.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <div className="sticky top-16 z-20 -mx-1 mb-1 bg-gray-50 px-1 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            aria-label={tCommon('search')}
            className="h-auto rounded-xl border-gray-200 bg-white py-2 pr-3 pl-9 text-sm placeholder:text-gray-400 focus-visible:border-blue-600 focus-visible:ring-blue-600/15 md:text-sm"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(null);
            }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{t('showing', { shown, total: defaults.length })}</span>
          {dirtyCount > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
              {t('unsavedCount', { count: dirtyCount })}
            </span>
          )}
        </div>
      </div>

      <div className={cn('transition-opacity', switching && 'opacity-60')}>
        {query && !sections.length ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-400">
            {t('noMatch', { q: search.trim() })}
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={accordionValue}
            onValueChange={(value) => (query ? setSearchOpen(value) : setOpen(value))}
            className="gap-2"
          >
            {sections.map((section) => {
              const unsaved = section.entries.filter(([key]) => isDirty(key)).length;
              return (
                <AccordionItem key={section.id} value={section.id} className="not-last:border-b-0">
                  <AccordionTrigger className="items-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xs hover:bg-gray-50 hover:no-underline">
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-bold text-gray-900">{sectionLabel(section.id)}</span>
                      <code className="text-[11px] font-normal text-gray-400">{section.id}.*</code>
                      <span className="text-xs font-normal text-gray-500">
                        {query
                          ? t('showing', { shown: section.entries.length, total: section.total })
                          : t('sectionCount', { count: section.total })}
                      </span>
                      {section.edited > 0 && (
                        <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          {t('sectionEdited', { count: section.edited })}
                        </span>
                      )}
                      {unsaved > 0 && (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          {t('unsavedCount', { count: unsaved })}
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pt-2 pb-2">
                    {section.entries.map(([key, text]) => (
                      <ContentField
                        key={key}
                        messageKey={key}
                        defaultText={text}
                        value={edited[key] ?? storedOf(key)}
                        dirty={isDirty(key)}
                        override={overrideOf(key)}
                        busy={busy[key] === true}
                        onChange={onChange}
                        onSave={onSave}
                        onRevert={onRevert}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      <AlertDialog open={revertKey !== null} onOpenChange={(isOpen) => !isOpen && setRevertKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revertTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('revertBody', { key: revertKey ?? '', lang: langLabel(lang) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revertKey && (
            <div className="max-h-40 overflow-auto rounded-lg bg-gray-50 px-3 py-2 text-sm whitespace-pre-wrap text-gray-700 ring-1 ring-gray-200 ring-inset">
              {defaultOf.get(revertKey)}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (revertKey) void revert(revertKey);
                setRevertKey(null);
              }}
            >
              {t('revert')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingLang !== null} onOpenChange={(isOpen) => !isOpen && setPendingLang(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('discardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('discardBody', { count: dirtyCount })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('keepEditing')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingLang) goTo(pendingLang);
                setPendingLang(null);
              }}
            >
              {t('discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
