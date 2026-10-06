import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import s from './apply.module.css';

/** The id of a field's error text, for aria-describedby. */
export const errorId = (id: string) => `${id}-error`;

/** Props that tie an input to its error: aria-invalid and aria-describedby. */
export function invalidProps(id: string, error: string | undefined) {
  return error ? { 'aria-invalid': true as const, 'aria-describedby': errorId(id) } : {};
}

/** The classes of the old `<input className="input">`: the site-wide `.input` plus the page's override. */
export const inputClass = (...extra: Array<string | false | undefined>) => cx('input', s.input, ...extra);

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={errorId(id)} className="text-[11px] font-medium text-rose-600">
      {error}
    </p>
  );
}

/** A label (tied to `htmlFor`), an optional hint on the right, the control, and its error. */
export function Field({
  label,
  htmlFor,
  hint,
  required,
  requiredLabel,
  error,
  errorFor,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  required?: boolean;
  /** Screen-reader text for the red star. */
  requiredLabel?: string;
  error?: string;
  /** The id the error text belongs to (defaults to htmlFor). */
  errorFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-600">
          {label}{' '}
          {required ? (
            <span className="text-rose-600">
              <span aria-hidden="true">*</span>
              {requiredLabel ? <span className="sr-only">({requiredLabel})</span> : null}
            </span>
          ) : null}
        </label>
        {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
      </div>
      {children}
      <FieldError id={errorFor ?? htmlFor} error={error} />
    </div>
  );
}
