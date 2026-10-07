import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SsoShell, ssoButton } from '@/components/auth/sso-shell';
import { requireAdminPage } from '@/lib/auth/admin';
import { RESOURCE_KEYS, type ResourceKey } from '@/lib/auth/permissions';

const LEVELS = ['view', 'edit', 'manage'] as const;

/**
 * Signed in, allowed into the admin, but not into this part of it — where
 * requireAdminPage(need) sends the person, with what was missing in `need`
 * ("jobs.edit"). Says what to ask for, so the request to an administrator is
 * one message rather than three.
 */
export default async function ForbiddenPage({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  await requireAdminPage();
  const t = await getTranslations('auth');
  const [resource, level] = ((await searchParams).need ?? '').split('.');
  const known =
    RESOURCE_KEYS.includes(resource as ResourceKey) && (LEVELS as readonly string[]).includes(level ?? '')
      ? { resource: resource as ResourceKey, level: level as (typeof LEVELS)[number] }
      : undefined;

  return (
    <SsoShell
      inline
      title={t('forbiddenTitle')}
      action={
        <>
          <form action="/sso/recheck" method="post">
            <button type="submit" className={ssoButton()}>
              {t('checkAgain')}
            </button>
          </form>
          <Link href="/admin" className={ssoButton('outline')}>
            {t('backToAdmin')}
          </Link>
        </>
      }
    >
      {known
        ? t('forbiddenBody', { resource: t(`resource.${known.resource}`), level: t(`level.${known.level}`) })
        : t('noAccessBody')}
    </SsoShell>
  );
}
