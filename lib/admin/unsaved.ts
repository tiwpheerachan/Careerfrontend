'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useSyncExternalStore } from 'react';

/**
 * Unsaved edits in the admin, known to the whole shell — and one way of
 * asking before they are thrown away.
 *
 * An editor (job editor, site content, an interview form…) calls
 *
 *   useUnsavedChanges(dirty)
 *
 * and while `dirty` is true every way out asks first:
 *   - closing the tab, reloading, typing a url → the browser's own prompt
 *     (beforeunload);
 *   - browser Back / Forward → the shell's "Discard changes?" dialog (a guard
 *     entry is pushed onto the history, see below);
 *   - the sidebar, a <GuardedLink>, useGuardedNavigation().push / .replace /
 *     .back → the same dialog.
 *
 * For its own exits (a "back" link, "cancel", switching a language…) an
 * editor uses one of:
 *
 *   <GuardedLink href="/admin/jobs">…</GuardedLink>      components/admin/shell/unsaved-guard.tsx
 *   const nav = useGuardedNavigation(); nav.push('/admin/jobs');
 *   confirmLeave(() => doTheThing());                     runs at once when nothing is unsaved
 *
 * The dialog itself is <UnsavedChangesDialog /> (components/admin/shell/
 * unsaved-guard.tsx), mounted once by the shell — outside the mobile drawer,
 * so it shows even when the drawer closes. "Discard" forgets every pending
 * edit (discardUnsavedChanges) and then goes; "Keep editing" stays and the
 * focus goes back where it was.
 */
const dirtyEditors = new Set<string>();

export function hasUnsavedChanges(): boolean {
  return dirtyEditors.size > 0;
}

/** Forget every pending edit — after the person chose to leave anyway. */
export function discardUnsavedChanges(): void {
  dirtyEditors.clear();
}

// --- Asking -----------------------------------------------------------------

export interface LeaveRequest {
  /** What leaving does: navigate, switch language… */
  proceed: () => void;
  /** Called when the person chose to keep editing. */
  stay?: () => void;
}

let pending: LeaveRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Leave — at once when nothing is unsaved, otherwise after the person agreed
 * in the shell's dialog (and not at all if they chose to keep editing).
 */
export function confirmLeave(proceed: () => void, stay?: () => void): void {
  if (!hasUnsavedChanges()) {
    proceed();
    return;
  }
  pending = { proceed, stay };
  emit();
}

/** The question the dialog is showing, if any. For <UnsavedChangesDialog />. */
export function useLeaveRequest(): LeaveRequest | null {
  return useSyncExternalStore(
    subscribe,
    () => pending,
    () => null,
  );
}

/** The person's answer, from <UnsavedChangesDialog />. */
export function answerLeave(leave: boolean): void {
  const request = pending;
  if (!request) return;
  pending = null;
  emit();
  if (leave) {
    discardUnsavedChanges();
    request.proceed();
  } else {
    request.stay?.();
  }
}

/** router.push / replace / back that ask first while something is unsaved. */
export function useGuardedNavigation() {
  const router = useRouter();
  return useMemo(
    () => ({
      push: (href: string, options?: { scroll?: boolean }) => confirmLeave(() => router.push(href, options)),
      replace: (href: string, options?: { scroll?: boolean }) => confirmLeave(() => router.replace(href, options)),
      back: () => confirmLeave(() => router.back()),
    }),
    [router],
  );
}

// --- Browser Back / Forward --------------------------------------------------
//
// The browser never asks before Back on a client-rendered page, and popstate
// cannot be cancelled. So while something is unsaved the page gets a second
// history entry with the same url (the "guard"), and the entry under it is
// marked as its "twin". Back leaves the guard for the twin — still the same
// page — and the dialog asks: keep editing puts a guard back, discard goes
// back once more, for real.
//
// A guard cannot be taken out of the history again. When the edits are saved
// (or left through the sidebar) it stays, and the next time Back reaches its
// twin the twin is skipped, so one Back is still one page. The mark sits on
// the twin rather than on the guard because Next.js rewrites the current
// entry's state (router.refresh after a save) but never an entry behind it.

const TWIN = '__shdUnsavedTwin';
/** The url of the last guard pushed: being on it again means no second guard. */
let guardHref: string | null = null;
let listening = false;

const historyState = (): Record<string, unknown> => (window.history.state as Record<string, unknown> | null) ?? {};

/** Takes the twin mark off the current entry (its state keeps Next's own fields). */
function unmarkCurrent() {
  const state = { ...historyState() };
  delete state[TWIN];
  window.history.replaceState(state, '');
}

function pushGuard() {
  window.history.replaceState({ ...historyState(), [TWIN]: window.location.href }, '');
  window.history.pushState({}, '');
  guardHref = window.location.href;
}

function onPopState(event: PopStateEvent) {
  const state = event.state as Record<string, unknown> | null;
  if (state?.[TWIN] !== window.location.href) return;
  if (!hasUnsavedChanges()) {
    // A guard left behind by saved edits: skip its twin — unmarked, so Forward can stop on it.
    unmarkCurrent();
    window.history.back();
    return;
  }
  // Back off the guard while editing: still on the same page, so ask.
  confirmLeave(() => {
    guardHref = null;
    unmarkCurrent();
    window.history.back();
  }, pushGuard);
}

function armHistoryGuard() {
  if (!listening) {
    window.addEventListener('popstate', onPopState);
    listening = true;
  }
  // Already on a guard (editing again after a save): nothing to add.
  if (!historyState()[TWIN] && guardHref === window.location.href) return;
  pushGuard();
}

export function useUnsavedChanges(dirty: boolean): void {
  const id = useId();

  useEffect(() => {
    if (!dirty) return;
    dirtyEditors.add(id);
    armHistoryGuard();
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      dirtyEditors.delete(id);
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty, id]);
}
