import type { ReactNode } from 'react';
import { Briefcase } from 'lucide-react';
import type { ApplicationStage, EvaluationResult, JobPublishState } from '@/lib/constants-types';
import { cn } from '@/lib/utils';

/**
 * The admin's own building blocks — the old frontend/src/admin/ui.tsx, same
 * look, on Tailwind 4. shadcn covers the controls (Button, Table, Dialog,
 * Select…); these are the pieces that were the old admin's identity.
 */

/** The SHDcareers mark: blue→indigo tile + wordmark. `compact` = tile only. */
export function Brand({
  compact = false,
  consoleLabel = 'Admin Console',
}: {
  compact?: boolean;
  consoleLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white shadow-xs shadow-blue-600/30">
        <Briefcase className="h-[18px] w-[18px]" />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="text-[15px] font-black tracking-tight text-gray-900">
            SHD<span className="text-blue-600">careers</span>
          </div>
          <div className="mt-1 text-[10px] font-semibold tracking-[0.12em] text-gray-400 uppercase">{consoleLabel}</div>
        </div>
      )}
    </div>
  );
}

/** Page title row: icon tile + h1 + subtitle, actions on the right. */
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div>
        )}
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200/60',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200/60',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200/60',
  red: 'bg-red-50 text-red-700 ring-red-200/60',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  gray: 'bg-gray-100 text-gray-600 ring-gray-200/60',
} as const;

export type Tone = keyof typeof TONES;

/** A pill with a thin inset ring, in one of six tones. */
export function ToneBadge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Hiring stage → tone (the old APP_TONE). */
export const STAGE_TONE: Record<ApplicationStage, Tone> = {
  NEW: 'blue',
  REVIEWING: 'amber',
  SHORTLISTED: 'violet',
  REJECTED: 'red',
  HIRED: 'emerald',
};

/** Job publishing state → tone (the old JOB_TONE). */
export const PUBLISH_TONE: Record<JobPublishState, Tone> = {
  PUBLISHED: 'emerald',
  DRAFT: 'amber',
  CLOSED: 'gray',
};

/** Interview result → tone. */
export const RESULT_TONE: Record<EvaluationResult, Tone> = { PENDING: 'amber', PASS: 'emerald', FAIL: 'red' };

/** Interview result → a chosen result's border, fill and text (the form's choice, a verdict). */
export const RESULT_STYLE: Record<EvaluationResult, string> = {
  PENDING: 'border-amber-300 bg-amber-50 text-amber-800',
  PASS: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  FAIL: 'border-red-300 bg-red-50 text-red-700',
};

/** A dashboard section card: title + subtitle, something on the right, content. */
export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white p-5 shadow-xs', className)}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
