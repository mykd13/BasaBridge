import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export type TitleKey =
  | 'read.pageTitle'
  | 'analysis.pageTitle'
  | 'questions.pageTitle'
  | 'result.pageTitle'
  | 'levelUp.pageTitle';

/** The page title from a catalog key under `student`, followed by the app name. */
export async function titleFor(key: TitleKey): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t(`student.${key}`)} · ${t('app.name')}` };
}
