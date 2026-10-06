import { LayoutDashboard } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/admin/ui';
import { Skeleton } from '@/components/ui/skeleton';

const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-xs';

/** The overview's layout in grey while the numbers are counted. */
export default async function DashboardLoading() {
  const t = await getTranslations('dashboard');
  return (
    <div aria-busy="true">
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<Skeleton className="h-[38px] w-36 rounded-xl" />}
      />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={card}>
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <Skeleton className="mt-4 h-8 w-16" />
              <Skeleton className="mt-2 h-4 w-28" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className={`${card} lg:col-span-2`}>
            <PanelHead />
            <div className="flex items-end gap-[3px]" style={{ height: 96 }}>
              {Array.from({ length: 30 }, (_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-t rounded-b-none"
                  style={{ height: 20 + ((i * 37) % 70) }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className={card}>
            <PanelHead />
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-6 w-6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={card}>
              <PanelHead />
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j}>
                    <div className="mb-1 flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-5" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PanelHead() {
  return (
    <div className="mb-4 space-y-1.5">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
