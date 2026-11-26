'use client';

import { ErrorView, type ErrorProps } from '@/components/error-view';

/** A public page failed. Below the fixed navbar, as the 404 is. */
export default function PageError(props: ErrorProps) {
  return (
    <section className="container-page pt-28 pb-16">
      <ErrorView {...props} />
    </section>
  );
}
