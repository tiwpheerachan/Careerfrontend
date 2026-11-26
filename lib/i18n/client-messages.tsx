import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { pickMessages } from './pick-messages';

/** What client components on every public page use (the navbar, the error page). */
export const COMMON_NAMESPACES = ['nav', 'common'];

/**
 * The messages the client components inside use — not the whole site's (some
 * 90 KB in every page). Server components need none of this. A provider
 * replaces the one around it, so each carries the common ones too.
 * client-messages.test.ts checks that nothing a page uses is left out.
 */
export async function ClientMessages({ use = [], children }: { use?: string[]; children: ReactNode }) {
  const messages = pickMessages(await getMessages(), [...COMMON_NAMESPACES, ...use]);
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
