'use client';

import { useTranslations } from 'next-intl';
import { createContext, useContext, type KeyboardEvent, type ReactNode } from 'react';
import { Field, inputClass, invalidProps } from '@/components/apply/field';
import { cx } from '@/lib/cx';
import { fieldId, type Draft, type Errors } from './draft';

/**
 * The wizard's inputs, in the application page's look (components/apply):
 * the same labels, inputs and error lines, so the two forms read as one site.
 * Each input is addressed by its path in the draft ("address.postalCode").
 */
interface FormContext {
  draft: Draft;
  set: (path: string, value: unknown) => void;
  errors: Errors;
  /** Check one field now (on leaving it), instead of waiting for "Next". */
  check: (path: string) => void;
}

/**
 * What a field lets through as it is typed: a phone number's characters, or
 * digits only. Anything else never reaches the box ("sdf" in a phone number).
 */
const ALLOW = {
  // Pasted "Tel 089-ABC-1234" becomes "089-1234…", not " 089--1234": no leading space, no doubled
  // separators, and a + only at the start.
  phone: (value: string) =>
    value
      .replace(/[^0-9+()\-\s]/g, '')
      .replace(/(?!^)\+/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/-{2,}/g, '-')
      .replace(/^\s+/, ''),
  digits: (value: string) => value.replace(/\D/g, ''),
  /** A number with at most one decimal point: weight 65.5, a GPA 3.25. */
  decimal: (value: string) => {
    const [whole, ...rest] = value.replace(/[^0-9.]/g, '').split('.');
    return rest.length ? `${whole}.${rest.join('')}` : whole!;
  },
} as const;

const Ctx = createContext<FormContext | null>(null);
export const FormProvider = Ctx.Provider;

export function useForm(): FormContext {
  const value = useContext(Ctx);
  if (!value) throw new Error('useForm() outside the application form');
  return value;
}

/** A value from the draft by its dotted path. */
export function read<T = string>(draft: Draft, path: string): T {
  return path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], draft) as T;
}

/** The draft with one value replaced, by path; everything else shared. */
export function write(draft: Draft, path: string, value: unknown): Draft {
  const [head, ...rest] = path.split('.');
  const node = draft as unknown as Record<string, unknown>;
  if (!rest.length) return { ...draft, [head!]: value };
  return {
    ...draft,
    [head!]: write(node[head!] as Draft, rest.join('.'), value),
  } as Draft;
}

function useError(path: string): string | undefined {
  const { errors } = useForm();
  const t = useTranslations('applicationForm.errors');
  const key = errors[path];
  return key ? t(key) : undefined;
}

export function TextField({
  path,
  label,
  required,
  placeholder,
  hint,
  type = 'text',
  inputMode,
  autoComplete,
  maxLength = 150,
  className,
  allow,
}: {
  path: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  type?: 'text' | 'email' | 'tel' | 'date';
  inputMode?: 'numeric' | 'decimal' | 'tel' | 'email';
  autoComplete?: string;
  maxLength?: number;
  className?: string;
  /** Characters the box takes (phone, digits); everything when not given. */
  allow?: keyof typeof ALLOW;
}) {
  const { draft, set, check } = useForm();
  const t = useTranslations('apply');
  const id = fieldId(path);
  const error = useError(path);
  return (
    <div className={className}>
      <Field label={label} htmlFor={id} required={required} requiredLabel={t('required')} hint={hint} error={error}>
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          placeholder={placeholder}
          className={inputClass()}
          value={read(draft, path)}
          aria-required={required || undefined}
          {...invalidProps(id, error)}
          onChange={(e) => set(path, allow ? ALLOW[allow](e.target.value) : e.target.value)}
          // A field says what is wrong as soon as it is left (an empty one waits for "Next").
          onBlur={() => check(path)}
        />
      </Field>
    </div>
  );
}

/** A number, typed as text (so "2" on the way to "25" is never rewritten); `decimal` takes 65.5. */
export function NumberField({
  decimal,
  ...props
}: Omit<Parameters<typeof TextField>[0], 'type' | 'inputMode' | 'maxLength' | 'allow'> & { decimal?: boolean }) {
  return decimal ? (
    <TextField {...props} inputMode="decimal" maxLength={6} allow="decimal" />
  ) : (
    <TextField {...props} inputMode="numeric" maxLength={6} allow="digits" />
  );
}

/**
 * One choice from a few, as pills (a radio group). Choosing the chosen one
 * again clears it, so an optional question can be left unanswered again.
 */
export function Choices({
  path,
  label,
  options,
  required,
  grid,
  className,
}: {
  path: string;
  label: string;
  options: Array<{ value: string; label: string; note?: string }>;
  required?: boolean;
  /** Even columns (for options with a note under them) instead of a row of pills. */
  grid?: boolean;
  className?: string;
}) {
  const { draft, set } = useForm();
  const t = useTranslations('apply');
  const id = fieldId(path);
  const { errors } = useForm();
  const te = useTranslations('applicationForm.errors');
  // A choice is chosen, not filled in: "please choose" rather than "please fill in".
  const error = errors[path] === 'required' ? te('choose') : errors[path] ? te(errors[path]) : undefined;
  const value = read(draft, path);
  return (
    <fieldset className={cx('space-y-2', className)} id={id} tabIndex={-1} {...invalidProps(id, error)}>
      <legend id={`${id}-label`} className="text-xs font-semibold text-slate-600">
        {label}{' '}
        {required ? (
          <span className="text-rose-600">
            <span aria-hidden="true">*</span>
            <span className="sr-only">({t('required')})</span>
          </span>
        ) : null}
      </legend>
      <div
        className={grid ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap gap-2'}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        onKeyDown={onRadioKeys}
      >
        {options.map((option, index) => {
          const checked = value === option.value;
          // One Tab stop for the group: the chosen choice, or the first.
          const tabbable = checked || (!options.some((o) => o.value === value) && index === 0);
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => set(path, checked && !required ? '' : option.value)}
              className={cx(
                'rounded-2xl border px-4 py-2 text-left text-sm font-semibold transition',
                'focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:outline-none',
                checked
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'border-slate-300 bg-white/85 text-slate-700 hover:border-blue-400 hover:bg-blue-50',
              )}
            >
              {option.label}
              {option.note ? (
                <span className={cx('block text-[11px] font-medium', checked ? 'text-blue-100' : 'text-slate-500')}>
                  {option.note}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[11px] font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** A radio group's arrows (and Home/End): move to the next choice and choose it, as a native group does. */
function onRadioKeys(event: KeyboardEvent<HTMLElement>) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (step === undefined && event.key !== 'Home' && event.key !== 'End') return;
  const radios = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  if (!radios.length) return;
  event.preventDefault();
  const at = radios.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? radios.length - 1
        : (Math.max(at, 0) + step! + radios.length) % radios.length;
  radios[next]!.focus();
  // Moving onto the chosen one must not unchoose it (a click on it would).
  if (radios[next]!.getAttribute('aria-checked') !== 'true') radios[next]!.click();
}

/** A tick box with its sentence. */
export function Tick({ path, children, required }: { path: string; children: ReactNode; required?: boolean }) {
  const { draft, set } = useForm();
  const id = fieldId(path);
  const error = useError(path);
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
        checked={read<boolean>(draft, path)}
        aria-required={required || undefined}
        {...invalidProps(id, error)}
        onChange={(e) => set(path, e.target.checked)}
      />
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm text-slate-700">
          {children}
        </label>
        {error ? (
          <p id={`${id}-error`} className="text-[11px] font-medium text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A heading inside a step. */
export function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/75 p-4 sm:p-5">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
