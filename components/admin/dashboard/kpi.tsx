import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One overview number: a tinted icon tile, the value, its label. A link when `href` is given. */
export function Kpi({
  icon,
  tone,
  label,
  value,
  hint,
  href,
}: {
  icon: ReactNode;
  /** Background of the icon tile, e.g. `bg-blue-50`. */
  tone: string;
  label: string;
  value: string;
  /** A small line under the label, e.g. what the number is made of. */
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('grid h-11 w-11 place-items-center rounded-2xl', tone)}>{icon}</div>
      <div className="mt-4 text-3xl font-black text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  );
}
