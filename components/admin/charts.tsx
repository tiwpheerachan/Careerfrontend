import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The old admin's two small charts (frontend/src/admin/ui.tsx), kept as they
 * were — plain divs, no chart library: a ranked horizontal bar list and a
 * 30-day sparkbar. Links are client-side now (the old BarList used <a> and
 * reloaded the page).
 */

const BAR_COLORS = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-cyan-500'];

export function BarList({
  items,
  emptyText,
}: {
  items: { label: string; value: number; sublabel?: string; href?: string }[];
  emptyText: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="py-6 text-center text-sm text-gray-400">{emptyText}</div>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const inner = (
          <>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-gray-700">{item.label}</span>
              <span className="shrink-0 text-sm font-bold text-gray-900">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full', BAR_COLORS[index % BAR_COLORS.length])}
                style={{ width: `${Math.round((item.value / max) * 100)}%` }}
              />
            </div>
            {item.sublabel && <div className="mt-0.5 text-[11px] text-gray-400">{item.sublabel}</div>}
          </>
        );
        return item.href ? (
          <Link key={index} href={item.href} className="-m-1 block rounded-lg p-1 transition hover:bg-gray-50">
            {inner}
          </Link>
        ) : (
          <div key={index}>{inner}</div>
        );
      })}
    </div>
  );
}

export function Sparkbars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 96 }}>
      {data.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count}`}
          className={cn(
            'flex-1 rounded-t transition-colors',
            d.count > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-200',
          )}
          style={{ height: d.count === 0 ? 3 : Math.max(6, Math.round((d.count / max) * 96)) }}
        />
      ))}
    </div>
  );
}
