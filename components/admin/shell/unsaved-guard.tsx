'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
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
import { answerLeave, confirmLeave, hasUnsavedChanges, useLeaveRequest } from '@/lib/admin/unsaved';

/**
 * The admin's one "Discard changes?" dialog. Mounted once, by the shell
 * (AppSidebar, outside the mobile drawer); every guarded way out — the
 * sidebar, <GuardedLink>, useGuardedNavigation, confirmLeave, browser Back —
 * asks through it, so the question always looks and reads the same.
 * How editors use it: lib/admin/unsaved.ts.
 */
export function UnsavedChangesDialog() {
  const t = useTranslations('unsaved');
  const request = useLeaveRequest();

  return (
    // Closing it any other way (Esc, "keep editing") is staying; Radix puts the focus back where it was.
    <AlertDialog open={request !== null} onOpenChange={(open) => !open && answerLeave(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-bold text-gray-900">{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('body')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('stay')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => answerLeave(true)}
          >
            {t('leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * next/link that asks first while an editor has unsaved changes
 * (useUnsavedChanges). Ctrl/⌘-click and new tabs are left alone — they leave
 * nothing behind.
 *
 *   <GuardedLink href="/admin/jobs" className="…">Back</GuardedLink>
 */
export function GuardedLink({
  href,
  replace,
  scroll,
  onNavigate,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      replace={replace}
      scroll={scroll}
      onNavigate={(event) => {
        onNavigate?.(event);
        if (!hasUnsavedChanges()) return;
        event.preventDefault();
        confirmLeave(() => (replace ? router.replace(href, { scroll }) : router.push(href, { scroll })));
      }}
      {...props}
    />
  );
}
