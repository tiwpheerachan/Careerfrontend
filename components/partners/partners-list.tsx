import { useTranslations } from 'next-intl';

type Partner = { name: string; desc: string };

/**
 * The partners grid. Extra top padding (pt-28) so the heading starts below the
 * fixed navbar; the old py-12 put it underneath.
 */
export function PartnersList() {
  const t = useTranslations('partners');
  const list = t.raw('list') as Partner[];

  return (
    <section className="container-page pt-28 pb-12">
      <h1 className="text-2xl font-black tracking-tight">{t('title')}</h1>
      <p className="mt-3 max-w-3xl text-sm text-slate-600">{t('p1')}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {list.map((p) => (
          <div key={p.name} className="card p-6">
            <div className="text-sm font-black">{p.name}</div>
            <div className="mt-2 text-sm text-slate-600">{p.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
