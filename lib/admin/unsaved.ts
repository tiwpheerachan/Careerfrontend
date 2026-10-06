'use client';

import { useEffect, useId } from 'react';

/**
 * Unsaved edits in the admin, known to the whole shell.
 *
 * An editor calls useUnsavedChanges(dirty). That covers both ways of leaving:
 *   - closing, reloading or typing a url → the browser's own prompt
 *     (beforeunload);
 *   - clicking another page in the sidebar → a client-side navigation the
 *     browser never asks about, so the sidebar checks hasUnsavedChanges()
 *     and asks itself.
 */
const dirtyEditors = new Set<string>();

export function hasUnsavedChanges(): boolean {
  return dirtyEditors.size > 0;
}

/** Forget every pending edit — after the person chose to leave anyway. */
export function discardUnsavedChanges(): void {
  dirtyEditors.clear();
}

export function useUnsavedChanges(dirty: boolean): void {
  const id = useId();

  useEffect(() => {
    if (!dirty) return;
    dirtyEditors.add(id);
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
