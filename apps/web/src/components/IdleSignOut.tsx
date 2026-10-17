'use client';

import { Button, Notice } from '@basabridge/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import { IDLE_SIGN_OUT_MS, IDLE_WARN_MS } from '@/lib/shared-device';
import { signOutAndReload } from '@/lib/sign-out-client';
import { endSession } from '@/server/actions/sign-out';

const ACTIVITY = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * Warns a learner after 25 idle minutes and signs them out at 30, for shared devices (BB-71).
 * This is the browser half. The server must also end idle student sessions at 30 minutes,
 * which needs a change to BB-7, so a closed tab cannot keep a session open.
 */
export function IdleSignOut({
  warnAfterMs = IDLE_WARN_MS,
  signOutAfterMs = IDLE_SIGN_OUT_MS,
}: {
  warnAfterMs?: number;
  signOutAfterMs?: number;
}) {
  const [warning, setWarning] = useState(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const outTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const warningRef = useRef(false);

  const arm = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(outTimer.current);
    warningRef.current = false;
    setWarning(false);
    warnTimer.current = setTimeout(() => {
      warningRef.current = true;
      setWarning(true);
    }, warnAfterMs);
    outTimer.current = setTimeout(() => {
      void signOutAndReload(endSession);
    }, signOutAfterMs);
  }, [warnAfterMs, signOutAfterMs]);

  useEffect(() => {
    arm();
    // Once the warning shows, only the button counts, so a stray tap does not hide it.
    const onActivity = () => {
      if (!warningRef.current) arm();
    };
    for (const name of ACTIVITY) window.addEventListener(name, onActivity, { passive: true });
    return () => {
      for (const name of ACTIVITY) window.removeEventListener(name, onActivity);
      clearTimeout(warnTimer.current);
      clearTimeout(outTimer.current);
    };
  }, [arm]);

  return (
    <>
      {warning ? (
        <div className="bb-idle" role="alertdialog" aria-labelledby="bb-idle-title">
          <Notice tone="warn" live="assertive">
            <p id="bb-idle-title" className="bb-notice__title">
              {t('idle.title')}
            </p>
            <p>{t('idle.body')}</p>
            <Button size="md" onClick={arm}>
              {t('idle.stay')}
            </Button>
          </Notice>
        </div>
      ) : null}
    </>
  );
}
