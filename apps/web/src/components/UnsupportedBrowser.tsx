'use client';

import { Notice } from '@basabridge/ui';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { detectFeatures, isSupported } from '@/lib/browser-support';

/**
 * A notice for browsers that cannot run the reading flow (BB-71). It never blocks sign in or
 * hides the page. It starts empty so the server and browser HTML match, then checks.
 */
export function UnsupportedBrowser() {
  const t = useTranslations();
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    setUnsupported(!isSupported(navigator.userAgent, detectFeatures()));
  }, []);
  if (!unsupported) return null;
  return (
    <div className="bb-unsupported">
      <Notice tone="warn" title={t('browser.unsupported.title')} live="polite">
        <p>{t('browser.unsupported.body')}</p>
      </Notice>
    </div>
  );
}
