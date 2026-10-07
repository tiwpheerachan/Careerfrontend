import type { KeyboardEvent, ReactNode } from 'react';

/** The admin's input look (as in the job editor). */
export const FIELD =
  'h-auto rounded-xl border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:border-blue-600 focus-visible:ring-0 aria-invalid:border-red-400 aria-invalid:ring-0';

/** A label over its control, with an error line under it. */
export function Labeled({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A radio group's keys, as a native one has them: one Tab stop for the group
 * (radioTabIndex), and the arrows (Home, End) move to the next choice and
 * choose it. Put on the element with role="radiogroup".
 */
export function onRadioKeyDown(event: KeyboardEvent<HTMLElement>) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (step === undefined && event.key !== 'Home' && event.key !== 'End') return;
  const radios = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)')];
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
  radios[next]!.click();
}

/** The one Tab stop: the chosen radio, or the first when none is. */
export const radioTabIndex = (on: boolean, index: number, anyOn: boolean) => (on || (!anyOn && index === 0) ? 0 : -1);

/** Two or more choices as one segmented control (a radio group). */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold text-gray-700">{label}</div>
      <div
        className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1"
        role="radiogroup"
        aria-label={label}
        onKeyDown={onRadioKeyDown}
      >
        {options.map((option, index) => {
          const on = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={radioTabIndex(
                on,
                index,
                options.some((o) => o.value === value),
              )}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={
                'flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed ' +
                (on ? 'bg-white text-blue-700 shadow-xs ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-800')
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
