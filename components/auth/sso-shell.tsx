import type { ReactNode } from 'react';
import { Brand } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

/**
 * The frame the sign-in screens share (ported from shd_onelink's app/sso/shell.tsx,
 * in this admin's look): sign-in failed, signed out, no access, cannot check.
 *
 * No sidebar: a navigation the person cannot use yet is furniture in the way
 * of the one or two buttons that matter. One white card, centred and narrow —
 * there is one sentence to read and at most two things to do.
 */
export function SsoShell({
  title,
  children,
  detail,
  action,
  inline = false,
}: {
  title: string;
  children: ReactNode;
  /** A line under the sentence — the account this is about, usually. */
  detail?: ReactNode;
  /** The buttons. Laid out in a row, wrapping on a narrow screen. */
  action?: ReactNode;
  /** Inside the admin's own frame (sidebar and header), not a page of its own. */
  inline?: boolean;
}) {
  const Root = inline ? 'div' : 'main';
  return (
    <Root className={cn('grid place-items-center', inline ? 'min-h-[60vh]' : 'min-h-screen bg-gray-50 p-6')}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <h1 className="text-xl font-black tracking-tight text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{children}</p>
        {detail && (
          <p className="mt-3 truncate rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{detail}</p>
        )}
        {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
      </div>
    </Root>
  );
}

/** The two button looks on these screens: the admin's blue, and a quiet outline. */
export function ssoButton(variant: 'primary' | 'outline' = 'primary') {
  return cn(
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition',
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  );
}
