'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile, rendered explicitly. Calls onToken with the token
 * (or '' when it expires or fails). Bump `resetKey` after a submission —
 * a token is good for one use.
 */
export function Turnstile({
  siteKey,
  language,
  resetKey,
  onToken,
}: {
  siteKey: string;
  language: string;
  resetKey: number;
  onToken: (token: string) => void;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const widget = useRef<string | null>(null);
  const tokenRef = useRef(onToken);
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!window.turnstile);

  useEffect(() => {
    tokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!ready || !box.current || !window.turnstile || widget.current) return;
    widget.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      language,
      callback: (token) => tokenRef.current(token),
      'expired-callback': () => tokenRef.current(''),
      'error-callback': () => tokenRef.current(''),
    });
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [ready, siteKey, language]);

  useEffect(() => {
    if (resetKey && widget.current) {
      window.turnstile?.reset(widget.current);
      tokenRef.current('');
    }
  }, [resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={box} className="mt-6" />
    </>
  );
}
