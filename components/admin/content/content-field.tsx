'use client';

import { Loader2, RotateCcw, Save } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { memo, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/admin/format';
import { checkOverride, describeProblem } from '@/lib/content/validate';
import type { AdminLocale } from '@/lib/i18n/admin';
import { cn } from '@/lib/utils';
import type { ContentOverride } from './content-editor';
import { useAbilities } from '@/components/admin/shell/abilities';

/** Longer built-in text gets a textarea. Decided by the default, so the field never changes type while typing. */
const MULTILINE_FROM = 60;

const fieldClass =
  'rounded-xl border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus-visible:border-blue-600 focus-visible:ring-blue-600/15 aria-invalid:border-red-400 aria-invalid:ring-0 md:text-sm';

/**
 * One message key: its key, the "edited" pill, the field, revert and save.
 * Saving checks the text first (lib/content/validate.ts — the server checks
 * the same): a text the public site could not render stays here, with what is
 * wrong under the field, until it is fixed.
 */
export const ContentField = memo(function ContentField({
  messageKey,
  siteLocale,
  defaultText,
  value,
  dirty,
  override,
  busy,
  serverError,
  onChange,
  onSave,
  onRevert,
}: {
  messageKey: string;
  /** The website language being edited (plural rules depend on it). */
  siteLocale: string;
  defaultText: string;
  value: string;
  dirty: boolean;
  override: ContentOverride | null;
  busy: boolean;
  /** What the server said about the last save of this key, if it refused it. */
  serverError?: string;
  onChange: (key: string, value: string) => void;
  onSave: (key: string, value: string) => void;
  onRevert: (key: string) => void;
}) {
  const t = useTranslations('content');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AdminLocale;
  const multiline = defaultText.length > MULTILINE_FROM || defaultText.includes('\n');
  const id = `content-${messageKey}`;
  // View-only access: the text is shown, not editable, and nothing saves.
  const canEdit = useAbilities().content.edit;
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  // After a refused save the check follows the typing, so the message goes as soon as the text is fixed.
  const [checked, setChecked] = useState(false);
  const problem = checked && dirty ? checkOverride(value, defaultText, siteLocale) : null;
  const error = problem ? describeProblem(problem, (key, values) => t(key, values)) : dirty ? serverError : undefined;
  const errorId = `${id}-error`;

  const save = () => {
    if (!canEdit || !dirty || busy) return;
    if (checkOverride(value, defaultText, siteLocale)) {
      setChecked(true);
      field.current?.focus();
      return;
    }
    onSave(messageKey, value);
  };

  // Enter saves a one-line field; Ctrl/⌘+Enter saves a textarea.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (multiline && !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    save();
  };

  const fieldProps = {
    id,
    ref: field,
    value,
    readOnly: !canEdit,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    onChange: (e: { target: { value: string } }) => onChange(messageKey, e.target.value),
    onKeyDown,
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-xs">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="min-w-0 font-mono text-[11px] break-all text-gray-400">
          <code>{messageKey}</code>
        </label>
        {override && (
          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
            {t('edited')}
          </span>
        )}
        {dirty && (
          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
            {t('unsaved')}
          </span>
        )}
      </div>

      {multiline ? (
        <Textarea {...fieldProps} className={cn(fieldClass, 'min-h-[70px] resize-y py-2')} />
      ) : (
        <Input {...fieldProps} className={cn(fieldClass, 'h-auto py-2')} />
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {override && (
          <span className="mr-auto text-[11px] text-gray-400">
            {override.updatedBy
              ? t('lastChanged', { by: override.updatedBy, at: formatDateTime(override.updatedAt, locale) })
              : t('lastChangedAt', { at: formatDateTime(override.updatedAt, locale) })}
          </span>
        )}
        {canEdit && override && (
          <button
            type="button"
            onClick={() => onRevert(messageKey)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t('revert')}
          </button>
        )}
        {canEdit && (
          <Button
            type="button"
            onClick={save}
            disabled={!dirty || busy}
            className="h-auto gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {tCommon('save')}
          </Button>
        )}
      </div>
    </div>
  );
});
