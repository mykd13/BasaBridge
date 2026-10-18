'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { setSignedOutLanguage } from '../i18n/actions.ts';
import { LANGS, type Lang } from '../i18n/types.ts';

/** Language switch for signed-out pages. Signed-in learners change it in reading help. */
export function LanguageSwitch() {
  const t = useTranslations('language');
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  function choose(lang: Lang) {
    if (lang === current) return;
    startTransition(() => setSignedOutLanguage(lang));
  }

  return (
    <div role="group" aria-label={t('label')} style={{ display: 'flex', gap: 8 }}>
      {LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          aria-pressed={lang === current}
          disabled={pending}
          style={{ minHeight: 48, minWidth: 48 }}
          onClick={() => choose(lang)}
        >
          {t(lang)}
        </button>
      ))}
    </div>
  );
}
