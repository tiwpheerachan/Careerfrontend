'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState, type CSSProperties } from 'react';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { cx } from '@/lib/cx';
import { LanguageSwitcher } from './language-switcher';
import { notePath } from './nav-history';

const LOGO = 'https://image.makewebcdn.com/makeweb/m_1920x0/hvIRoKhSo/DefaultData/logo_2x.png';

/**
 * Pages whose top is a full-bleed picture hero: the navbar floats over it
 * transparent until the page scrolls. Every other page (job detail, apply,
 * the application form, partners, 404) starts on white, where the white
 * links and menu icon would be invisible — there it starts in the dark
 * "scrolled" style.
 */
const HERO_PAGES = new Set(['/', '/about', '/why-shd', '/jobs']);

/** Active like react-router's NavLink: the page itself or anything under it. */
function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ href, label, scrolled }: { href: string; label: string; scrolled: boolean }) {
  const active = useActive(href);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition',
        'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white/40',
        'text-white/90',
        scrolled ? 'hover:bg-white/10' : 'hover:bg-black/10',
        active ? ' text-white' : 'bg-transparent',
      )}
      style={
        scrolled
          ? {
              border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }
          : undefined
      }
    >
      {label}
    </Link>
  );
}

const ctaStyle = (scrolled: boolean): CSSProperties =>
  scrolled
    ? {
        background: 'rgba(255,255,255,0.14)',
        color: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
      }
    : { background: 'rgba(255,255,255,0.92)', color: 'rgba(0,0,0,0.88)', boxShadow: '0 18px 56px rgba(0,0,0,0.28)' };

/**
 * The floating glass pill at the top of every public page — ported from
 * frontend/src/components/Navbar.tsx, same classes (moved to Tailwind 4).
 * It narrows and darkens once the page scrolls past 14px. On phones the links
 * open in a dropdown layer that locks the page behind it.
 */
export function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [scrolledPast, setScrolled] = useState(false);
  const scrolled = scrolledPast || !HERO_PAGES.has(pathname);
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the menu on navigation (state reset during render, not in an effect).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // For "Back" buttons: has the visitor moved between pages of this site in this tab?
  useEffect(() => notePath(pathname), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const close = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, []);

  // Lock the page behind the open mobile menu.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const maxW = scrolled ? 1080 : 1180;
  const links = [
    { key: 'about', href: '/about' },
    { key: 'why', href: '/why-shd' },
    { key: 'jobs', href: '/jobs' },
    { key: 'applicationForm', href: '/application-form' },
  ] as const;

  return (
    <header className="pointer-events-none fixed top-0 z-50 w-full">
      <div className="w-full" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto w-full px-3 pt-3 sm:px-4">
          <div
            className="pointer-events-auto mx-auto flex w-full items-center justify-between gap-3 transition-all duration-300 ease-out"
            style={{ maxWidth: maxW }}
          >
            <div
              className={cx(
                'flex w-full items-center justify-between gap-3',
                'transition-all duration-300 ease-out',
                scrolled
                  ? 'rounded-[999px] bg-black/55 backdrop-blur-xl ring-1 shadow-[0_22px_80px_rgba(0,0,0,0.35)] px-4 py-2'
                  : 'rounded-[999px] backdrop-blur-md ring-1 ring-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.22)] px-3 py-2',
              )}
            >
              <Link href="/" className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote logo, sized by height */}
                <img
                  src={LOGO}
                  alt="SHD"
                  className={cx('w-auto transition-all duration-300', scrolled ? 'h-8' : 'h-9')}
                  style={{
                    filter: scrolled
                      ? 'drop-shadow(0 10px 22px rgba(0,0,0,0.30))'
                      : 'drop-shadow(0 14px 32px rgba(0,0,0,0.40))',
                  }}
                />
              </Link>

              <nav className="hidden items-center gap-2 md:flex">
                {links.map((link) => (
                  <NavItem key={link.key} href={link.href} label={t(link.key)} scrolled={scrolled} />
                ))}
              </nav>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden items-center text-white/90 sm:flex">
                  <Suspense>
                    <LanguageSwitcher />
                  </Suspense>
                </div>

                <Link
                  href="/jobs"
                  className={cx(
                    'hidden items-center justify-center rounded-full px-5 py-2 text-sm font-extrabold transition sm:inline-flex',
                    'hover:-translate-y-0.5 active:translate-y-0',
                    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white/40',
                  )}
                  style={ctaStyle(scrolled)}
                >
                  {t('findJobs')}
                </Link>

                <div className="md:hidden">
                  <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex items-center justify-center rounded-full px-3 py-2 text-white/90 transition hover:bg-white/10 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white/40"
                    aria-label={t('menu')}
                    aria-expanded={open}
                    aria-controls="mobile-menu"
                  >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu: a fixed layer over the page. `inert` when closed, so its
              links are not tabbable while invisible (the old one left them focusable). */}
          <div
            id="mobile-menu"
            className={cx('fixed inset-0 z-60 md:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
            inert={!open}
          >
            <div
              className={cx(
                'absolute inset-0 bg-black/25 backdrop-blur-[1px] transition-opacity',
                open ? 'opacity-100' : 'opacity-0',
              )}
              onClick={() => setOpen(false)}
            />
            <div
              className={cx(
                'absolute right-0 left-0 px-3 transition-all duration-200 sm:px-4',
                open ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
              )}
              style={{ top: 'calc(env(safe-area-inset-top) + 72px)' }}
            >
              <div className="mx-auto w-full" style={{ maxWidth: maxW }}>
                <div className="rounded-3xl bg-black/70 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.40)] ring-1 backdrop-blur-xl">
                  <div className="mb-3 text-white/90">
                    <Suspense>
                      <LanguageSwitcher />
                    </Suspense>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[...links, { key: 'partners', href: '/partners' } as const].map((link) => (
                      <Link
                        key={link.key}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="rounded-2xl px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                      >
                        {t(link.key)}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/jobs"
                      onClick={() => setOpen(false)}
                      className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-extrabold"
                      style={{
                        background: 'rgba(255,255,255,0.14)',
                        color: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(255,255,255,0.18)',
                      }}
                    >
                      {t('findJobs')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
