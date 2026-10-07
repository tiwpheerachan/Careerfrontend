'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Abilities } from '@/lib/auth/admin';

/**
 * What the signed-in person may do, for client components: the sidebar hides
 * what they cannot open, editors hide buttons they cannot use.
 *
 * Only for what is shown. Every API route checks again on the server
 * (requireAdmin) — a hidden button is a courtesy, not the lock.
 */
const AbilitiesContext = createContext<Abilities | null>(null);

export function AbilitiesProvider({ value, children }: { value: Abilities; children: ReactNode }) {
  return <AbilitiesContext.Provider value={value}>{children}</AbilitiesContext.Provider>;
}

export function useAbilities(): Abilities {
  const value = useContext(AbilitiesContext);
  if (!value) throw new Error('useAbilities() outside the admin layout');
  return value;
}
