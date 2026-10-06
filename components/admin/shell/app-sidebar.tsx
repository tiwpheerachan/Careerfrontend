'use client';

import { Briefcase, ExternalLink, FileText, LayoutDashboard, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, type MouseEvent } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { discardUnsavedChanges, hasUnsavedChanges } from '@/lib/admin/unsaved';
import { cn } from '@/lib/utils';
import { Brand } from '../ui';

const NAV = [
  { href: '/admin/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/jobs', key: 'jobs', icon: Briefcase },
  { href: '/admin/applications', key: 'applications', icon: Users },
  { href: '/admin/content', key: 'content', icon: FileText },
] as const;

/**
 * The admin's left column — the old fixed 256px white sidebar, now shadcn's
 * Sidebar (which also gives the mobile drawer, focus handling and ESC).
 * Active item: blue-50 wash, blue text, a blue bar on the left edge.
 */
export function AppSidebar({ actorEmail }: { actorEmail: string }) {
  const t = useTranslations('nav');
  const brand = useTranslations('brand');
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  // Where the person tried to go while an editor had unsaved changes.
  const [leavingTo, setLeavingTo] = useState<string | null>(null);

  const go = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    setOpenMobile(false);
    if (!hasUnsavedChanges() || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    setLeavingTo(href);
  };

  return (
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
            {NAV.map(({ href, key, icon: Icon }) => {
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
                    <Link href={href} onClick={go(href)} aria-current={active ? 'page' : undefined}>
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
              {actorEmail.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-gray-900">
                {actorEmail === 'dev@localhost' ? t('devUser') : actorEmail}
              </div>
              <div className="text-[11px] text-gray-400">{t('signedInAs')}</div>
            </div>
          </div>
          {/* Sign-out arrives with SSO; the button keeps its place and says so. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <button
                  type="button"
                  disabled
                  aria-label={t('signOut')}
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{t('signOutSoon')}</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>

      <AlertDialog open={leavingTo !== null} onOpenChange={(open) => !open && setLeavingTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unsavedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('unsavedBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('stay')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const href = leavingTo;
                discardUnsavedChanges();
                setLeavingTo(null);
                if (href) router.push(href);
              }}
            >
              {t('leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
