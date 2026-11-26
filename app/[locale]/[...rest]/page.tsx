import { notFound } from 'next/navigation';

// Not cached: any url at all ends up here, and each would be kept on disk.
export const dynamic = 'force-dynamic';

/**
 * Any path under a language that no page matches (/en/does-not-exist):
 * answered with [locale]/not-found.tsx, in that language, with status 404.
 */
export default function CatchAllPage() {
  notFound();
}
