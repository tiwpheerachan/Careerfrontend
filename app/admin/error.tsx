'use client';

import { ErrorView, type ErrorProps } from '@/components/error-view';

/** An admin page failed: inside the admin's frame, so the sidebar still works. */
export default function AdminError(props: ErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorView {...props} />
    </div>
  );
}
