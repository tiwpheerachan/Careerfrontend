'use client';

import { Check, Copy, Link2, Loader2, Send, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ToneBadge, type Tone } from '@/components/admin/ui';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAbilities } from '@/components/admin/shell/abilities';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { EVALUATOR_ROLES } from '@/lib/constants';
import { intlLocale, type AdminLocale } from '@/lib/i18n/admin';
import type { InvitationState } from '@/lib/interview/invitations';
import { Segmented } from './fields';
import { PeoplePicker, type PickedPerson } from './people-picker';

/** An invitation as the page passes it in (the API's shape, dates as strings). */
export interface PanelInvitation {
  id: string;
  link: string;
  round: 1 | 2;
  evaluatorRole: (typeof EVALUATOR_ROLES)[number];
  senior: boolean;
  /** An edit link: the evaluation it changes. */
  editOf: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  expiresAt: string;
  state: InvitationState;
  invitees: Array<{
    id: string;
    email: string;
    name: string | null;
    jobTitle: string | null;
    openedAt: string | null;
    submittedAt: string | null;
  }>;
}

export interface PanelCandidate {
  applicationId: string | null;
  applicationFormId: string | null;
  name: string;
  position: string | null;
  department: string | null;
}

const STATE_TONE: Record<InvitationState, Tone> = {
  PENDING: 'blue',
  OPEN: 'amber',
  COMPLETED: 'emerald',
  EXPIRED: 'gray',
  REVOKED: 'red',
};

/**
 * Inviting people without a role to evaluate this candidate: one link for
 * the people chosen (lib/interview/invitations.ts), its state, who has
 * opened it and who has sent. Copy the link to send it (there is no email
 * from this app); switch it off; make a new one when it runs out.
 */
export function InvitationsPanel({
  candidate,
  invitations,
  footer,
}: {
  candidate: PanelCandidate;
  /** This page of them (the page pages the list; `footer` is its pagination). */
  invitations: PanelInvitation[];
  footer?: ReactNode;
}) {
  const t = useTranslations('interviews.invite');
  const tf = useTranslations('interviews.form');
  const locale = useLocale() as AdminLocale;
  const router = useRouter();
  const can = useAbilities();
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState<1 | 2>(1);
  const [role, setRole] = useState<(typeof EVALUATOR_ROLES)[number]>('DEPARTMENT');
  const [senior, setSenior] = useState(false);
  const [people, setPeople] = useState<PickedPerson[]>([]);
  const [creating, setCreating] = useState(false);
  const [missingPeople, setMissingPeople] = useState(false);
  const [made, setMade] = useState<PanelInvitation | null>(null);
  const [revoking, setRevoking] = useState<PanelInvitation | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  /** The invitation whose link could not be copied: shown as text to copy by hand. */
  const [copyByHand, setCopyByHand] = useState<string | null>(null);

  const when = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale(locale), {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    }).format(new Date(iso));

  const copy = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(id);
      toast.success(t('copied'));
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      // No clipboard (http, or the browser refused): show the link, selected.
      setCopyByHand(id);
      toast.error(t('copyFailed'));
    }
  };

  const create = async () => {
    if (!people.length) {
      setMissingPeople(true);
      return;
    }
    setCreating(true);
    try {
      const { invitation } = await adminFetch<{ invitation: PanelInvitation }>('/interview-invitations', {
        method: 'POST',
        json: {
          applicationId: candidate.applicationId,
          applicationFormId: candidate.applicationFormId,
          candidateName: candidate.name,
          position: candidate.position,
          department: candidate.department,
          round,
          evaluatorRole: role,
          senior,
          invitees: people.map((p) => ({
            email: p.email,
            name: p.name,
            unionId: p.unionId,
            jobTitle: p.jobTitle,
            department: p.department,
          })),
        },
      });
      setMade(invitation);
      setPeople([]);
      setSenior(false);
      router.refresh();
    } catch (error) {
      toast.error(t('createFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async () => {
    if (!revoking) return;
    try {
      await adminFetch(`/interview-invitations/${revoking.id}`, { method: 'DELETE' });
      toast.success(t('revoked'));
      setRevoking(null);
      router.refresh();
    } catch (error) {
      toast.error(t('revokeFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
    }
  };

  const live = (state: InvitationState) => state === 'PENDING' || state === 'OPEN';

  // The pieces of a link, shared by its card (narrow screens) and its table row.
  const which = (inv: PanelInvitation) => (
    <>
      <span className="font-semibold text-gray-900">
        {tf(`rounds.${inv.round}`)} · {tf(`roles.${inv.evaluatorRole}`)}
      </span>
      {inv.senior && <ToneBadge tone="violet">Senior</ToneBadge>}
      {inv.editOf && <ToneBadge tone="amber">{t('editLink')}</ToneBadge>}
    </>
  );
  const madeBy = (inv: PanelInvitation) =>
    t('madeBy', { who: inv.createdByName || inv.createdBy, time: when(inv.createdAt) });
  const actions = (inv: PanelInvitation) => (
    <div className="flex justify-end gap-1.5">
      {live(inv.state) && (
        <button
          type="button"
          onClick={() => void copy(inv.link, inv.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-700 hover:bg-gray-50"
        >
          {copied === inv.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {t('copyLink')}
        </button>
      )}
      {live(inv.state) && can.applications.edit && (
        <button
          type="button"
          onClick={() => setRevoking(inv)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-red-600 hover:bg-red-50"
        >
          {t('revoke')}
        </button>
      )}
    </div>
  );
  const invitees = (inv: PanelInvitation) => (
    <ul className="flex flex-wrap gap-1.5">
      {inv.invitees.map((p) => (
        <li
          key={p.id}
          title={p.email}
          className={
            p.submittedAt
              ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200'
              : p.openedAt
                ? 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200'
                : 'rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200'
          }
        >
          {p.name || p.email} ·{' '}
          {p.submittedAt ? t('person.sent') : p.openedAt ? t('person.opened') : t('person.notYet')}
        </li>
      ))}
    </ul>
  );
  /** The link to copy by hand (no clipboard), and what to do with a dead link. */
  const afterRow = (inv: PanelInvitation) => (
    <>
      {copyByHand === inv.id && live(inv.state) && (
        <input
          readOnly
          autoFocus
          value={inv.link}
          aria-label={t('linkLabel')}
          onFocus={(e) => e.target.select()}
          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 font-mono text-xs text-gray-800"
        />
      )}
      {(inv.state === 'EXPIRED' || inv.state === 'REVOKED') && (
        <p className="mt-2 text-xs text-gray-500">{t('makeNew')}</p>
      )}
    </>
  );

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{t('title')}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{t('hint')}</p>
        </div>
        {can.applications.edit && (
          <button
            type="button"
            onClick={() => {
              setMade(null);
              setMissingPeople(false);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            <UserPlus className="h-4 w-4 text-blue-600" /> {t('invite')}
          </button>
        )}
      </div>

      {invitations.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">{t('none')}</p>
      ) : (
        <>
          {/* Below xl (the sidebar leaves a table too little room): one card per link. */}
          <ul className="mt-4 space-y-3 xl:hidden">
            {invitations.map((inv) => (
              <li key={inv.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {which(inv)}
                    <ToneBadge tone={STATE_TONE[inv.state]}>{t(`states.${inv.state}`)}</ToneBadge>
                    <span className="text-xs text-gray-500">
                      {live(inv.state) ? t('until', { time: when(inv.expiresAt) }) : madeBy(inv)}
                    </span>
                  </div>
                  {actions(inv)}
                </div>
                <div className="mt-2">{invitees(inv)}</div>
                {afterRow(inv)}
              </li>
            ))}
          </ul>

          <table className="mt-4 hidden w-full text-left text-sm xl:table">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="py-2 pr-3 font-semibold">{t('columns.round')}</th>
                <th className="py-2 pr-3 font-semibold">{t('columns.state')}</th>
                <th className="py-2 pr-3 font-semibold">{t('columns.invitees')}</th>
                <th className="py-2 pr-3 font-semibold">{t('columns.created')}</th>
                <th className="py-2 pr-3 font-semibold">{t('columns.expires')}</th>
                <th className="py-2 font-semibold">
                  <span className="sr-only">{t('columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 align-top last:border-0">
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-2">{which(inv)}</div>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <ToneBadge tone={STATE_TONE[inv.state]}>{t(`states.${inv.state}`)}</ToneBadge>
                  </td>
                  <td className="py-3 pr-3">
                    {invitees(inv)}
                    {afterRow(inv)}
                  </td>
                  <td className="py-3 pr-3 text-xs text-gray-500">
                    <div className="text-gray-700">{inv.createdByName || inv.createdBy}</div>
                    {when(inv.createdAt)}
                  </td>
                  <td className="py-3 pr-3 text-xs whitespace-nowrap text-gray-500">
                    {live(inv.state) ? when(inv.expiresAt) : '—'}
                  </td>
                  <td className="py-3 text-right">{actions(inv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {footer}

      <Dialog open={open} onOpenChange={(next) => !creating && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{made ? t('madeTitle') : t('dialogTitle')}</DialogTitle>
            <DialogDescription>{made ? t('madeBody') : t('dialogBody', { name: candidate.name })}</DialogDescription>
          </DialogHeader>
          {made ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
                <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  readOnly
                  value={made.link}
                  aria-label={t('linkLabel')}
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 bg-transparent font-mono text-xs text-gray-800 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => void copy(made.link, made.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {copied === made.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {t('copyLink')}
                </button>
              </div>
              <p className="text-xs text-gray-500">{t('rules')}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {t('done')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Segmented
                  label={tf('round')}
                  value={round}
                  options={[1, 2].map((r) => ({ value: r as 1 | 2, label: tf(`rounds.${r}`) }))}
                  onChange={setRound}
                />
                <Segmented
                  label={tf('evaluatorRole')}
                  value={role}
                  options={EVALUATOR_ROLES.map((r) => ({ value: r, label: t(`rolesShort.${r}`) }))}
                  onChange={setRole}
                />
              </div>
              <label className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600"
                  checked={senior}
                  onChange={(e) => setSenior(e.target.checked)}
                />
                {tf('seniorToggle')}
              </label>
              <div>
                <div className="mb-1.5 text-sm font-semibold text-gray-700">{t('people')}</div>
                <PeoplePicker
                  value={people}
                  onChange={(next) => {
                    setPeople(next);
                    setMissingPeople(false);
                  }}
                  invalid={missingPeople}
                />
                {missingPeople && <p className="mt-1.5 text-xs font-medium text-red-600">{t('pickSomeone')}</p>}
              </div>
              <p className="text-xs text-gray-500">{t('rules')}</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={creating}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void create()}
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('create')}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={revoking !== null} onOpenChange={(next) => !next && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revokeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking &&
                t('revokeBody', {
                  which: `${tf(`rounds.${revoking.round}`)} · ${tf(`roles.${revoking.evaluatorRole}`)}`,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('keep')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void revoke();
              }}
            >
              {t('revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
