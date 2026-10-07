import { getTranslations } from 'next-intl/server';
import { SsoShell, ssoButton } from './sso-shell';

/**
 * Signed in, and not let in — or not knowably let in. (Ported from shd_onelink.)
 *
 * Two reasons, two cards, because the useful response differs. "No access" is
 * a fact about this person, and the people who can change it are the central
 * system's administrators; the buttons are "check again" for after they have,
 * and "sign out" for using another account. "Unavailable" is a fact about the
 * moment, and the only sensible response is to try again.
 *
 * Both name the account: "which account are you signed in with" is the first
 * question an administrator asks.
 */
export async function NoAccess({ email, reason }: { email: string; reason: 'access' | 'unavailable' }) {
  const t = await getTranslations('auth');
  const access = reason === 'access';

  return (
    <SsoShell
      title={access ? t('noAccessTitle') : t('unavailableTitle')}
      detail={`${t('signedInAs')} ${email}`}
      action={
        <>
          <form action="/sso/recheck" method="post">
            <button type="submit" className={ssoButton()}>
              {access ? t('checkAgain') : t('tryAgain')}
            </button>
          </form>
          <form action="/sso/logout" method="post">
            <button type="submit" className={ssoButton('outline')}>
              {t('signOut')}
            </button>
          </form>
        </>
      }
    >
      {access ? t('noAccessBody') : t('unavailableBody')}
    </SsoShell>
  );
}
