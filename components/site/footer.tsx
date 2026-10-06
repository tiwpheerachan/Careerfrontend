import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';

/**
 * The footer, as on the old site — except that its text is translated (it was
 * hard-coded English) and the navigation items are links (they were plain
 * text).
 */
export async function Footer() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-sm font-black tracking-tight">SHD Careers</div>
            <div className="mt-2 text-sm text-slate-600">{t('tagline')}</div>
          </div>

          <div className="text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{t('navigation')}</div>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/about" className="hover:text-slate-900">
                  {nav('about')}
                </Link>
              </li>
              <li>
                <Link href="/why-shd" className="hover:text-slate-900">
                  {nav('why')}
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-slate-900">
                  {nav('jobs')}
                </Link>
              </li>
              <li>
                <Link href="/partners" className="hover:text-slate-900">
                  {nav('partners')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{t('contact')}</div>
            <div className="mt-2 space-y-1">
              <div>
                {t('email')}:{' '}
                <a href="mailto:careers@shd-technology.co.th" className="hover:text-slate-900">
                  careers@shd-technology.co.th
                </a>
              </div>
              <div>© {year} SHD Technology</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
