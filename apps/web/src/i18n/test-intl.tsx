import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { messagesFor } from './messages.ts';
import type { Lang, Wording } from './types.ts';

/** Wrap a component in the same provider the root layout uses, for render tests. */
export function withIntl(children: ReactNode, lang: Lang = 'en', wording: Wording = 'standard') {
  return (
    <NextIntlClientProvider locale={lang} messages={messagesFor(lang, wording)}>
      {children}
    </NextIntlClientProvider>
  );
}
