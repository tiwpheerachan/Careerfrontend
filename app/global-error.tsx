'use client';

import { ErrorView, useErrorLocale, type ErrorProps } from '@/components/error-view';
import './globals.css';

/** A root layout itself failed: this replaces it, document and styles included. */
export default function GlobalError(props: ErrorProps) {
  return (
    <html lang={useErrorLocale()}>
      <body className="bg-gray-50">
        <title>SHDcareers</title>
        <main className="grid min-h-screen place-items-center p-6">
          <ErrorView {...props} />
        </main>
      </body>
    </html>
  );
}
