import { getTranslations } from 'next-intl/server';
import { SsoShell, ssoButton } from '@/components/auth/sso-shell';

/**
 * Sign-in did not work. (Ported from shd_onelink.)
 *
 * Each reason gets its own sentence because the useful response differs: an
 * expired code means try again, a suspended account means talk to whoever
 * administers the central system, and a missing client_secret is not the
 * reader's problem at all — it is ours, and "try again" would send them round
 * a loop that cannot end. So "Try again" is only offered where it can work.
 */
const RETRYABLE = new Set(['code', 'state', 'unavailable']);
const KNOWN = ['code', 'state', 'client', 'access', 'inactive', 'setup'];

export default async function SsoErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const t = await getTranslations('auth');
  const { reason = 'unavailable' } = await searchParams;
  const known = KNOWN.includes(reason) ? reason : 'unavailable';

  return (
    <SsoShell
      title={t('errorTitle')}
      action={
        RETRYABLE.has(known) && (
          // A route handler that redirects to the central system, not a page: it
          // needs a full navigation, which next/link would not make.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/sso/login" className={ssoButton()}>
            {t('tryAgain')}
          </a>
        )
      }
    >
      {t(`error_${known}` as 'error_code')}
    </SsoShell>
  );
}
