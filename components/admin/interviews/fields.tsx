import type { ReactNode } from 'react';

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
      >
        {options.map((option) => {
          const on = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={on}
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
