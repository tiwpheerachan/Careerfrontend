import { notFound } from 'next/navigation';

/**
 * Any path under a language that no page matches (/en/does-not-exist):
 * answered with [locale]/not-found.tsx, in that language, with status 404.
 */
export default function CatchAllPage() {
  notFound();
}
