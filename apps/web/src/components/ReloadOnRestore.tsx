'use client';

import { useEffect } from 'react';

/**
 * Reload a signed-in page that the browser brings back from its back-forward cache (BB-71).
 * `Cache-Control: no-store` keeps Chrome and Safari from caching these pages, but Firefox can
 * still restore one on Back. On a shared device that would show the last learner's screen, so a
 * restored page asks the server again, and the server sends a signed-out visitor to sign in.
 */
export function ReloadOnRestore() {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);
  return null;
}
