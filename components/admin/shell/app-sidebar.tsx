'use client';

import { Briefcase, ClipboardCheck, ExternalLink, FileText, LayoutDashboard, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmLeave, hasUnsavedChanges } from '@/lib/admin/unsaved';
import { cn } from '@/lib/utils';
import { Brand } from '../ui';
import { useAbilities } from './abilities';
import { UnsavedChangesDialog } from './unsaved-guard';

const NAV = [
  { href: '/admin/dashboard', key: 'dashboard', icon: LayoutDashboard, area: 'applications' },
  { href: '/admin/jobs', key: 'jobs', icon: Briefcase, area: 'jobs' },
  { href: '/admin/applications', key: 'applications', icon: Users, area: 'applications' },
  { href: '/admin/interviews', key: 'interviews', icon: ClipboardCheck, area: 'applications' },
  { href: '/admin/content', key: 'content', icon: FileText, area: 'content' },
] as const;

/**
 * The admin's left column — the old fixed 256px white sidebar, now shadcn's
 * Sidebar (which also gives the mobile drawer, focus handling and ESC).
 * Active item: blue-50 wash, blue text, a blue bar on the left edge.
 * Only the parts this person may open are listed (useAbilities).
 *
 * With unsaved edits on the page a menu item asks first (the shell's one
 * dialog, rendered beside the Sidebar — not in it — so on a phone it is not
 * unmounted with the drawer; the drawer stays open behind it until the person
 * chooses to leave).
 */
export function AppSidebar({ actor }: { actor: { name: string; email: string; dev: boolean } }) {
  const can = useAbilities();
  const t = useTranslations('nav');
  const brand = useTranslations('brand');
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const firstItem = useRef<HTMLAnchorElement>(null);

  // A client-side navigation (Ctrl/⌘-click and new tabs never get here).
  const go = (href: string) => (event: { preventDefault: () => void }) => {
    if (!hasUnsavedChanges()) {
      setOpenMobile(false);
      return;
    }
    event.preventDefault();
    confirmLeave(() => {
      setOpenMobile(false);
      router.push(href);
    });
  };

  // The drawer, opened: start on the menu. Radix would focus the first button
  // it finds — it skips links — which is "sign out", one Enter away from
  // signing out. Its own focus runs as the drawer mounts, so this goes after.
  useEffect(() => {
    if (!isMobile || !openMobile) return;
    const frame = requestAnimationFrame(() => firstItem.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isMobile, openMobile]);

  return (
    <>
      <Sidebar className="border-r border-gray-200">
        <SidebarHeader className="h-16 justify-center border-b border-gray-100 px-5">
          <Brand consoleLabel={brand('console')} />
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="h-auto px-3 pb-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              {t('menu')}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {NAV.filter(({ area }) => can[area].view).map(({ href, key, icon: Icon }, index) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        'group relative h-auto gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                        'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                        'data-active:bg-blue-50 data-active:font-semibold data-active:text-blue-700 data-active:hover:bg-blue-50',
                      )}
                    >
                      <Link
                        ref={index === 0 ? firstItem : undefined}
                        href={href}
                        onNavigate={go(href)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span
                          className={cn(
                            'absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 transition-all',
                            active ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <Icon
                          className={cn(
                            'h-[18px]! w-[18px]!',
                            active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600',
                          )}
                        />
                        <span>{t(key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-gray-100 p-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ExternalLink className="h-[18px] w-[18px] text-gray-400" />
            {t('viewSite')}
          </a>
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-gray-700 to-gray-900 text-xs font-bold text-white uppercase">
                {(actor.name || actor.email).charAt(0) || 'A'}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-semibold text-gray-900" title={actor.email}>
                  {actor.dev ? t('devUser') : actor.name || actor.email}
                </div>
                <div className="truncate text-[11px] text-gray-400">
                  {actor.dev || !actor.name ? t('signedInAs') : actor.email}
                </div>
              </div>
            </div>
            {/* Signs out of this app only (the central session stays): POST, so no
              link or prefetch can do it. In development without SSO there is
              no session to end. */}
            {actor.dev ? null : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <form action="/sso/logout" method="post">
                    <button
                      type="submit"
                      aria-label={t('signOut')}
                      className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </form>
                </TooltipTrigger>
                <TooltipContent side="top">{t('signOut')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <UnsavedChangesDialog />
    </>
  );
}
