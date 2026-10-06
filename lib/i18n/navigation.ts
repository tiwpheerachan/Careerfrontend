import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Locale-aware Link, redirect and router: `<Link href="/jobs">` keeps the current language. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
