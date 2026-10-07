import { getTranslations } from 'next-intl/server';
import { SsoShell, ssoButton } from '@/components/auth/sso-shell';

/**
 * Where Sign out lands. (Ported from shd_onelink.)
 *
 * Not /sso/login: that goes straight to the central system — where the person
 * is still signed in — which sends them straight back in, and Sign out would
 * visibly do nothing. This page is the pause that makes the button mean
 * something: the session here is over, and going back in is a choice.
 */
export default async function SignedOutPage() {
  const t = await getTranslations('auth');
  return (
    <SsoShell
      title={t('signedOutTitle')}
      action={
        // A route handler that redirects to the central system: a full navigation.
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a href="/sso/login" className={ssoButton()}>
          {t('signInAgain')}
        </a>
      }
    >
      {t('signedOutBody')}
    </SsoShell>
  );
}
