import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { messagesFor } from './messages.ts';
import type { Lang, Wording } from './types.ts';

/**
 * Wrap a component in the same provider the root layout uses, for render tests. The fixed time
 * zone keeps next-intl from logging an environment fallback warning on every render.
 */
export function withIntl(children: ReactNode, lang: Lang = 'en', wording: Wording = 'standard') {
  return (
    <NextIntlClientProvider locale={lang} messages={messagesFor(lang, wording)} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
