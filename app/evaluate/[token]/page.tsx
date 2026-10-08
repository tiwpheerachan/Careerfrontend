import { CheckCircle2, Clock } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Brand } from '@/components/admin/ui';
import { CandidateMaterials } from '@/components/admin/interviews/candidate-materials';
import { EvaluationForm } from '@/components/admin/interviews/evaluation-form';
import { LanguagePicker } from '@/components/admin/shell/language-picker';
import { SsoShell, ssoButton } from '@/components/auth/sso-shell';
import { checkInviteePage, type InviteeRefusal } from '@/lib/auth/invitee';
import { NotFoundError } from '@/lib/errors';
import { withCurrentCandidate } from '@/lib/interview/current-candidate';
import { intlLocale, type AdminLocale } from '@/lib/i18n/admin';
import { store } from '@/lib/store';

type Props = { params: Promise<{ token: string }> };

/** Today in Bangkok, YYYY-MM-DD. */
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());

/**
 * /evaluate/{token} — an interview invitation link (lib/interview/invitations.ts).
 *
 * proxy.ts has already sent anyone not signed in to SSO and back. Here the
 * question is whether the signed-in person is ON this link — not their role:
 * an employee signing in for the first time has none, and needs none. If they
 * are, the link starts its 6 hours (the first time anyone opens it) and they
 * get the candidate's application and the form, once. If not, the page says
 * why, in words — the wrong account, too late, already sent.
 *
 * An edit link (`editOf`) opens the evaluation it is for, filled in, for its
 * evaluator to change and send once.
 */
export default async function EvaluatePage({ params }: Props) {
  const { token } = await params;
  const t = await getTranslations('invitee');
  const check = await checkInviteePage(token);

  if (!check.ok) {
    // An edit link is its evaluation's owner's: say whose, not "someone HR chose".
    const owner = check.invitation?.editOf ? check.invitation.invitees[0] : undefined;
    return (
      <Refused reason={check.reason} email={check.email} editFor={owner ? owner.name || owner.email : undefined} />
    );
  }

  const { invitation, identity } = check.access;
  await store().interviewInvitations.markOpened(token, identity.email);
  // Re-read: opening it may have just started the 6 hours.
  const fresh = (await store().interviewInvitations.byToken(token)) ?? invitation;

  // An edit link: the evaluation it changes (gone if it was deleted since).
  const editing = fresh.editOf
    ? await store()
        .interviewEvaluations.get(fresh.editOf)
        .then(withCurrentCandidate)
        .catch((error: unknown) => {
          if (error instanceof NotFoundError) return null;
          throw error;
        })
    : null;
  if (fresh.editOf && !editing) return <Refused reason="notFound" />;

  const candidate = fresh.candidate;
  const application =
    candidate.kind === 'application' && candidate.id ? await store().applications.get(candidate.id) : null;
  const locale = (await getLocale()) as AdminLocale;
  const until = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(fresh.expiresAt);

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Brand consoleLabel={t('brand')} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <Clock className="h-3.5 w-3.5" /> {t('openUntil', { time: until })}
          </span>
          <LanguagePicker label={t('language')} />
        </div>
      </header>
      <h1 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
        {editing ? t('editTitle') : t('title')}
      </h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">{editing ? t('editIntro') : t('intro')}</p>

      <EvaluationForm
        evaluation={editing}
        today={today()}
        evaluator={identity.name || identity.email}
        readOnly={false}
        prefill={{
          link: null,
          name: candidate.name,
          position: candidate.position,
          department: candidate.department,
        }}
        guest={{ token, round: fresh.round, evaluatorRole: fresh.evaluatorRole, senior: fresh.senior }}
        materials={
          <CandidateMaterials token={token} application={application} hasApplicationForm={candidate.kind === 'form'} />
        }
      />
    </main>
  );
}

/** Why this person cannot use the link, and what to do about it. */
async function Refused({ reason, email, editFor }: { reason: InviteeRefusal; email?: string; editFor?: string }) {
  const t = await getTranslations('invitee.refused');
  const brand = await getTranslations('invitee');
  const signOut = (
    <form action="/sso/logout" method="post">
      <button type="submit" className={ssoButton('outline')}>
        {t('switchAccount')}
      </button>
    </form>
  );
  return (
    <SsoShell
      consoleLabel={brand('brand')}
      title={editFor && reason === 'notInvited' ? t('notInvitedEdit.title') : t(`${reason}.title`)}
      detail={email ? t('signedInAs', { email }) : undefined}
      action={
        reason === 'signIn' ? (
          // A route handler that goes to the central system: a full navigation.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/sso/login" className={ssoButton()}>
            {t('signInButton')}
          </a>
        ) : reason === 'notInvited' ? (
          signOut
        ) : reason === 'submitted' ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {t('thanks')}
          </span>
        ) : null
      }
    >
      {editFor && reason === 'notInvited' ? t('notInvitedEdit.body', { who: editFor }) : t(`${reason}.body`)}
    </SsoShell>
  );
}
