import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { privacyContact } from '@/legal/contact';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.links');
  return { title: t('privacy') };
}

export default async function Page() {
  const lang = await getLocale();
  return <LegalDocument variant="privacy" lang={lang} contact={privacyContact(process.env)} />;
}
