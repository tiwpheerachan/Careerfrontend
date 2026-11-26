'use client';

import { ErrorView, type ErrorProps } from '@/components/error-view';

/** An invitation link's page failed. What was scored is still in the tab (evaluation-form-draft.ts). */
export default function EvaluateError(props: ErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ErrorView {...props} />
    </main>
  );
}
