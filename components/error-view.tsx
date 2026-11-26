'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ADMIN_LOCALE_COOKIE, adminLocaleOf, type AdminLocale } from '@/lib/i18n/admin';

/** Its own text: an error page cannot count on the messages (or their provider) being there. */
const TEXT: Record<AdminLocale, Record<'title' | 'body' | 'retry' | 'home' | 'code', string>> = {
  th: {
    title: 'เกิดข้อผิดพลาด',
    body: 'หน้านี้แสดงไม่ได้ในขณะนี้ กรุณาลองอีกครั้ง หากยังพบปัญหา โปรดแจ้งรหัสด้านล่างให้เราทราบ',
    retry: 'ลองอีกครั้ง',
    home: 'กลับหน้าแรก',
    code: 'รหัสข้อผิดพลาด',
  },
  en: {
    title: 'Something went wrong',
    body: 'This page cannot be shown right now. Please try again; if it keeps happening, tell us the code below.',
    retry: 'Try again',
    home: 'Back to the home page',
    code: 'Error code',
  },
  zh: {
    title: '出错了',
    body: '此页面暂时无法显示，请重试。如果问题仍然存在，请将下方代码告知我们。',
    retry: '重试',
    home: '返回首页',
    code: '错误代码',
  },
};

const ADMIN_AREA = /^\/(admin|evaluate|sso)(\/|$)/;

/** The url's language; the cookie's in the admin's area (lib/i18n/admin.ts). */
function pageLocale(): AdminLocale {
  const { pathname } = window.location;
  return adminLocaleOf(
    ADMIN_AREA.test(pathname)
      ? new RegExp(`(?:^|;\\s*)${ADMIN_LOCALE_COOKIE}=(\\w+)`).exec(document.cookie)?.[1]
      : pathname.split('/')[1],
  );
}

const pageHome = () => {
  const { pathname } = window.location;
  // An invitee has no other page of ours to go to.
  if (/^\/evaluate(\/|$)/.test(pathname)) return null;
  return ADMIN_AREA.test(pathname) ? '/admin' : `/${pageLocale()}`;
};

const never = () => () => {};

export interface ErrorProps {
  error: unknown;
  /** Next 16.3+: fetches and renders the segment again. */
  retry: () => void;
}

export function useErrorLocale(): AdminLocale {
  return useSyncExternalStore(never, pageLocale, () => 'th');
}

/** What every error boundary shows: what happened, a retry, and the code that finds it in the server's log. */
export function ErrorView({ error, retry }: ErrorProps) {
  const locale = useErrorLocale();
  const home = useSyncExternalStore(never, pageHome, () => null);
  const text = TEXT[locale];
  const digest = error instanceof Error && 'digest' in error ? String(error.digest) : undefined;

  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import('@/lib/sentry-client').then(({ reportError }) => reportError(error));
    }
  }, [error]);

  return (
    <div role="alert" lang={locale} className="card mx-auto w-full max-w-md p-8 text-center text-gray-900">
      <h1 className="text-xl font-black tracking-tight">{text.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{text.body}</p>
      {digest && (
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {text.code}: <code className="font-mono break-all">{digest}</code>
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => retry()} className="btn btn-primary">
          {text.retry}
        </button>
        {home && (
          // A full navigation: whatever is broken on this page starts over.
          <a href={home} className="btn btn-ghost">
            {text.home}
          </a>
        )}
      </div>
    </div>
  );
}
