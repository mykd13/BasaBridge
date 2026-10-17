import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import '@basabridge/ui/tokens.css';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const app = await getTranslations('app');
  return { title: app('name'), description: app('tagline') };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
